import { env } from '../config/env.js';
import { logger as sharedLogger } from '../lib/logger.js';
import { prisma } from '../db/client.js';
import { evaluateIntent } from '../modules/policy-engine/evaluate.service.js';
import type { EvaluateIntentInput } from '../modules/policy-engine/evaluate.schema.js';
import { PRISMAPIError, PRISMSignalProvider } from '../strategy/prism-signal-provider.js';
import type { SignalProvider } from '../strategy/signal-provider.interface.js';
import { computePositionSizing } from '../strategy/position-sizing.js';
import { captureErrorToSentry } from '../lib/telemetry.js';

type EvaluateIntentResponse = Awaited<ReturnType<typeof evaluateIntent>>;
type EvaluateIntentFn = (intent: EvaluateIntentInput) => Promise<EvaluateIntentResponse>;

interface StrategyLoopOptions {
  signalProvider?: SignalProvider;
  evaluateIntentFn?: EvaluateIntentFn;
  logger?: typeof sharedLogger;
  targetAsset?: string;
}

const PRISM_PAUSE_BASE_MS = 15_000;
const PRISM_PAUSE_MAX_MS = 5 * 60_000;

function getPrismPauseDurationMs(consecutiveFailures: number): number {
  const exponent = Math.max(0, consecutiveFailures - 4);
  return Math.min(PRISM_PAUSE_MAX_MS, PRISM_PAUSE_BASE_MS * 2 ** exponent);
}

export class StrategyLoop {
  private readonly signalProvider: SignalProvider;
  private readonly evaluateIntentFn: EvaluateIntentFn;
  private readonly logger: typeof sharedLogger;
  private readonly targetAsset: string;

  private intervalHandle: NodeJS.Timeout | null = null;
  private started = false;
  private isTickRunning = false;
  private consecutivePrismFailures = 0;
  private prismPaused = false;
  private prismPauseUntilMs = 0;

  constructor(options: StrategyLoopOptions = {}) {
    this.signalProvider = options.signalProvider ?? new PRISMSignalProvider();
    this.evaluateIntentFn = options.evaluateIntentFn ?? evaluateIntent;
    this.logger = options.logger ?? sharedLogger;
    this.targetAsset = (options.targetAsset ?? 'BTC').toUpperCase();
  }

  async start(): Promise<void> {
    if (this.started) return;

    if (!env.AGENT_ID) {
      this.logger.warn({ event: 'STRATEGY_LOOP_DISABLED' }, 'AGENT_ID not set; strategy loop disabled');
      return;
    }

    if (!env.INTERNAL_SERVICE_KEY) {
      this.logger.warn(
        { event: 'STRATEGY_LOOP_DISABLED' },
        'INTERNAL_SERVICE_KEY not set; strategy loop cannot call /v1/evaluate',
      );
      return;
    }

    this.started = true;
    this.intervalHandle = setInterval(() => {
      void this.tick();
    }, env.STRATEGY_TICK_INTERVAL_MS);

    void this.tick();
    this.logger.info(
      { event: 'STRATEGY_LOOP_STARTED', tick_interval_ms: env.STRATEGY_TICK_INTERVAL_MS },
      'PRISM strategy interval loop started',
    );
  }

  async stop(): Promise<void> {
    if (!this.started) return;

    this.started = false;
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }

    this.logger.info({ event: 'STRATEGY_LOOP_STOPPED' }, 'Strategy loop stopped');
  }

  public async tick(): Promise<void> {
    try {
      if (!this.started || this.isTickRunning) return;
      this.isTickRunning = true;

      if (!env.AGENT_ID) return;

      const agent = await prisma.agent.findUnique({
        where: { id: env.AGENT_ID },
        select: { id: true, isActive: true, erc8004TokenId: true },
      });

      if (!agent?.isActive || !agent.erc8004TokenId) {
        this.logger.warn(
          { event: 'STRATEGY_AGENT_INACTIVE_OR_UNREGISTERED', agent_id: env.AGENT_ID },
          'Skipping tick: agent inactive or not registered on-chain',
        );
        return;
      }

      if (this.prismPaused) {
        if (Date.now() < this.prismPauseUntilMs) {
          this.logger.warn({ event: 'PRISM_PAUSED_SKIP', resume_at_ms: this.prismPauseUntilMs }, 'Skipping PRISM requests while outage backoff is active');
          return;
        }

        this.logger.info({ event: 'PRISM_PAUSE_PROBE' }, 'PRISM backoff elapsed; probing for recovery');
      }

      const canonicalSymbol = await this.signalProvider.resolveSymbol(this.targetAsset);

      if (this.prismPaused) {
        // Probe recovery on each tick while paused
        await this.signalProvider.getSignal(canonicalSymbol);
        this.prismPaused = false;
        this.consecutivePrismFailures = 0;
        this.prismPauseUntilMs = 0;
        this.logger.info({ event: 'PRISM_RESUMED', symbol: canonicalSymbol }, 'PRISM recovered; strategy loop resumed');
        return;
      }

      const signal = await this.signalProvider.getSignal(canonicalSymbol);
      this.consecutivePrismFailures = 0;

      if (signal.direction === 'neutral') {
        this.logger.info({ event: 'PRISM_NEUTRAL', symbol: canonicalSymbol }, 'PRISM signal neutral, skipping tick');
        return;
      }

      if (signal.confidence < 0.6) {
        this.logger.info(
          { event: 'PRISM_LOW_CONFIDENCE', symbol: canonicalSymbol, confidence: signal.confidence },
          'PRISM signal low confidence, skipping tick',
        );
        return;
      }

      const risk = await this.signalProvider.getRisk(canonicalSymbol);
      const position = computePositionSizing({
        spendCapPerTxUsd: env.STRATEGY_TRADE_AMOUNT_USD,
        drawdownRiskScore: risk.drawdownRiskScore,
        confidence: signal.confidence,
      });

      const evaluation = await this.evaluateIntentFn(
        this.toTradeIntent({
          signalAction: signal.direction,
          signalReason: `prism_confidence=${signal.confidence}`,
          pair: canonicalSymbol,
          amountUsdScaled: position.amountUsdScaled,
        }),
      );

      if (evaluation.result === 'block') {
        this.logger.info(
          {
            event: 'TRADE_BLOCKED',
            reason: evaluation.reason,
            evaluation_id: evaluation.evaluation_id,
          },
          'Trade blocked by policy engine',
        );
        return;
      }

      this.logger.info(
        {
          event: 'EVALUATION_ALLOWED',
          pair: canonicalSymbol,
          amount_usd_scaled: position.amountUsdScaled.toString(),
          evaluation_id: evaluation.evaluation_id,
        },
        'Evaluation returned allow; execution continues in policy pipeline',
      );
    } catch (error) {
      if (error instanceof PRISMAPIError) {
        this.consecutivePrismFailures += 1;

        this.logger.error(
          {
            event: 'PRISM_API_ERROR',
            failures: this.consecutivePrismFailures,
            endpoint: error.endpoint,
            status: error.statusCode,
            message: error.message,
          },
          'PRISM API error during strategy tick',
        );

        if (this.consecutivePrismFailures > 3) {
          this.prismPaused = true;
          this.prismPauseUntilMs = Date.now() + getPrismPauseDurationMs(this.consecutivePrismFailures);
          this.logger.error({
            event: 'PRISM_PAUSED',
            failures: this.consecutivePrismFailures,
            resume_at_ms: this.prismPauseUntilMs,
          }, 'PRISM outage threshold reached; loop paused until successful signal fetch');
          await captureErrorToSentry({
            error,
            tags: { stage: 'prism_outage_pause' },
            context: {
              failures: this.consecutivePrismFailures,
              endpoint: error.endpoint,
              resume_at_ms: this.prismPauseUntilMs,
            },
          });
        }

        return;
      }

      this.logger.error({ err: error }, 'Strategy loop processing error');
      await captureErrorToSentry({
        error,
        tags: { stage: 'strategy_loop' },
      });
    } finally {
      this.isTickRunning = false;
    }
  }

  private toTradeIntent(input: {
    signalAction: 'buy' | 'sell';
    signalReason: string;
    pair: string;
    amountUsdScaled: bigint;
  }): EvaluateIntentInput {
    const agentId = env.AGENT_ID;
    if (!agentId) throw new Error('AGENT_ID is not configured');

    return {
      agent_id: agentId,
      action_type: 'trade',
      venue: 'kraken-spot',
      amount: input.amountUsdScaled.toString(),
      token_in: 'USDC',
      token_out: 'USD',
      eip712_domain: {
        name: 'PolicyMint',
        version: '1',
        chainId: env.CHAIN_ID,
        verifyingContract: env.RISK_ROUTER_ADDRESS,
      },
      params: {
        pair: input.pair,
        side: input.signalAction,
        signal_reason: input.signalReason,
      },
    };
  }
}