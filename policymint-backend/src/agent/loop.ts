import { PolicyType } from '@prisma/client';
import { evaluateIntent } from '../modules/policy-engine/evaluate.service.js';
import type { EvaluateIntentInput } from '../modules/policy-engine/evaluate.schema.js';
import { env } from '../config/env.js';
import { prisma } from '../db/client.js';
import { logger as sharedLogger } from '../lib/logger.js';
import { captureError } from '../lib/sentry.js';
import { computeAmountUsdScaled } from './position-sizing.js';
import { PRISMSignalProvider } from './prism-signal-provider.js';
import { PRISMAPIError, type SignalProvider } from './signal-provider.js';
import { KrakenAdapter } from '../exchange/kraken.js';
import { KrakenWebSocket } from '../strategy/kraken-ws.js';
import { MomentumStrategy } from '../strategy/momentum.strategy.js';
import type { IStrategy } from '../strategy/strategy.interface.js';

const DEFAULT_TARGET_ASSET = 'BTC';
const DEFAULT_SPEND_CAP_PER_TX_USD = 450;
const MIN_CONFIDENCE = 0.6;
const MIN_BTC_VOLUME = 0.0001;

type EvaluateIntentResponse = Awaited<ReturnType<typeof evaluateIntent>>;
type EvaluateIntentFn = (intent: EvaluateIntentInput) => Promise<EvaluateIntentResponse>;

interface PriceFeed {
  connect(): Promise<void>;
  disconnect(): void;
}

interface StrategyLoopOptions {
  signalProvider?: SignalProvider;
  logger?: typeof sharedLogger;
  strategy?: IStrategy;
  krakenAdapter?: KrakenAdapter;
  evaluateIntentFn?: EvaluateIntentFn;
  createPriceFeed?: (onPrice: (price: number) => void) => PriceFeed;
}

interface EvaluateApiResponse {
  result: 'allow' | 'block';
  reason: string | null;
  policy_id: string | null;
  evaluation_id: string;
  eip712_signed_intent: string;
}

export class StrategyLoop {
  private readonly provider: SignalProvider;
  private readonly logger: typeof sharedLogger;

  private readonly legacyMode: boolean;
  private readonly legacyStrategy: IStrategy;
  private readonly legacyKrakenAdapter: KrakenAdapter;
  private readonly legacyEvaluateIntentFn: EvaluateIntentFn;
  private readonly legacyPriceFeed: PriceFeed;

  private timer: NodeJS.Timeout | null = null;
  private started = false;
  private isProcessing = false;
  private prismFailureStreak = 0;
  private pausedForPrism = false;

  constructor(options: StrategyLoopOptions = {}) {
    this.provider = options.signalProvider ?? new PRISMSignalProvider();
    this.logger = options.logger ?? sharedLogger;

    this.legacyMode = Boolean(
      options.strategy || options.krakenAdapter || options.evaluateIntentFn || options.createPriceFeed,
    );
    this.legacyStrategy = options.strategy ?? new MomentumStrategy();
    this.legacyKrakenAdapter = options.krakenAdapter ?? new KrakenAdapter();
    this.legacyEvaluateIntentFn = options.evaluateIntentFn ?? evaluateIntent;
    this.legacyPriceFeed = options.createPriceFeed
      ? options.createPriceFeed((price) => this.onPrice(price))
      : new KrakenWebSocket((price) => this.onPrice(price));
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    if (this.legacyMode) {
      if (!env.AGENT_ID) {
        this.logger.warn({ event: 'STRATEGY_LOOP_DISABLED' }, 'AGENT_ID not set; strategy loop disabled');
        return;
      }

      this.started = true;
      const initResult = await this.legacyKrakenAdapter.paperInit();
      if (!initResult.success) {
        this.logger.warn(
          {
            event: 'PAPER_INIT_FAILED',
            stderr: initResult.stderr,
            exitCode: initResult.exitCode,
            timedOut: initResult.timedOut,
          },
          'Kraken paper account initialization failed; continuing',
        );
      }

      await this.legacyPriceFeed.connect();
      this.logger.info({ event: 'STRATEGY_LOOP_STARTED' }, 'Legacy strategy loop started');
      return;
    }

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
    this.timer = setInterval(() => {
      void this.tick();
    }, env.STRATEGY_TICK_INTERVAL_MS);

    this.logger.info(
      { event: 'STRATEGY_LOOP_STARTED', intervalMs: env.STRATEGY_TICK_INTERVAL_MS },
      'PRISM strategy loop started',
    );

    await this.tick();
  }

  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    this.started = false;

    if (this.legacyMode) {
      this.legacyPriceFeed.disconnect();
      this.legacyKrakenAdapter.cleanup();
      this.legacyStrategy.reset();
      this.logger.info({ event: 'STRATEGY_LOOP_STOPPED' }, 'Legacy strategy loop stopped');
      return;
    }

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.logger.info({ event: 'STRATEGY_LOOP_STOPPED' }, 'Strategy loop stopped');
  }

  public async processSignal(price: number): Promise<void> {
    if (!this.legacyMode || !this.started) {
      return;
    }

    try {
      const signal = this.legacyStrategy.onPrice(price);

      if (signal.action === 'hold') {
        return;
      }

      const btcVolume = this.floorToSixDecimals(signal.amountUsd / price);
      if (btcVolume < MIN_BTC_VOLUME) {
        this.logger.info(
          {
            event: 'BELOW_MINIMUM_VOLUME',
            pair: signal.pair,
            amountUsd: signal.amountUsd,
            price,
            btcVolume,
          },
          'Skipping trade below Kraken BTC minimum volume',
        );
        return;
      }

      const evaluation = await this.legacyEvaluateIntentFn(
        this.toLegacyTradeIntent({
          signalAction: signal.action,
          signalReason: signal.reason,
          btcVolume,
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

      const cliPair = signal.pair.replace('/', '');
      if (signal.action === 'buy') {
        await this.legacyKrakenAdapter.paperBuy(cliPair, btcVolume);
      } else {
        await this.legacyKrakenAdapter.paperSell(cliPair, btcVolume);
      }
    } catch (error) {
      this.logger.error({ err: error }, 'Legacy strategy loop processing error');
    }
  }

  public onPrice(price: number): void {
    if (this.legacyMode) {
      if (this.isProcessing) {
        return;
      }

      this.isProcessing = true;
      void this.processSignal(price).finally(() => {
        this.isProcessing = false;
      });
      return;
    }

    void this.tick();
  }

  private async tick(): Promise<void> {
    if (!this.started || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const agentId = env.AGENT_ID;
      if (!agentId) {
        return;
      }

      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: {
          id: true,
          isActive: true,
          erc8004TokenId: true,
        },
      });

      if (!agent?.isActive || !agent.erc8004TokenId) {
        this.logger.info(
          { event: 'STRATEGY_SKIP_INACTIVE_OR_UNREGISTERED', agentId },
          'Agent inactive or missing erc8004 token id; skipping tick',
        );
        return;
      }

      const targetAsset = DEFAULT_TARGET_ASSET;
      const canonicalSymbol = await this.provider.resolveSymbol(targetAsset);

      if (this.pausedForPrism) {
        await this.provider.getSignal(canonicalSymbol);
        this.prismFailureStreak = 0;
        this.pausedForPrism = false;
        this.logger.info({ event: 'PRISM_LOOP_RESUMED' }, 'PRISM recovered; strategy loop resumed');
        return;
      }

      const signal = await this.provider.getSignal(canonicalSymbol);
      this.prismFailureStreak = 0;

      if (signal.direction === 'neutral') {
        this.logger.info({ event: 'PRISM_SIGNAL_NEUTRAL', symbol: canonicalSymbol }, 'PRISM signal neutral, skipping tick');
        return;
      }

      if (signal.confidence < MIN_CONFIDENCE) {
        this.logger.info(
          { event: 'PRISM_SIGNAL_LOW_CONFIDENCE', confidence: signal.confidence, symbol: canonicalSymbol },
          `PRISM signal low confidence (${signal.confidence.toFixed(3)}), skipping tick`,
        );
        return;
      }

      const risk = await this.provider.getRisk(canonicalSymbol);
      const spendCapPerTxUsd = await this.resolveSpendCapUsd(agent.id);
      const amountUsdScaled = computeAmountUsdScaled({
        spendCapPerTxUsd,
        drawdownRiskScore: risk.drawdownRiskScore,
        confidence: signal.confidence,
      });

      const evaluation = await this.submitForEvaluation({
        agentId: agent.id,
        direction: signal.direction,
        symbol: canonicalSymbol,
        amountUsdScaled,
      });

      if (evaluation.result === 'block') {
        this.logger.info(
          { event: 'STRATEGY_TICK_BLOCKED', evaluation_id: evaluation.evaluation_id, reason: evaluation.reason },
          'Strategy tick blocked by policy',
        );
        return;
      }

      this.logger.info(
        { event: 'STRATEGY_TICK_ALLOWED', evaluation_id: evaluation.evaluation_id },
        'Strategy tick submitted and allowed',
      );
    } catch (error) {
      if (error instanceof PRISMAPIError) {
        this.prismFailureStreak += 1;
        captureError(error, { function: 'StrategyLoop.tick', streak: this.prismFailureStreak });

        if (this.prismFailureStreak >= 3) {
          this.pausedForPrism = true;
          this.logger.error(
            { event: 'PRISM_CRITICAL_OUTAGE', streak: this.prismFailureStreak },
            'PRISM API failure streak exceeded threshold; pausing strategy loop until recovery',
          );
        }

        return;
      }

      captureError(error, { function: 'StrategyLoop.tick' });
      this.logger.error({ err: error }, 'Strategy loop tick failed');
    } finally {
      this.isProcessing = false;
    }
  }

  private async submitForEvaluation(input: {
    agentId: string;
    direction: 'buy' | 'sell';
    symbol: string;
    amountUsdScaled: bigint;
  }): Promise<EvaluateApiResponse> {
    const response = await fetch(`http://127.0.0.1:${env.PORT}/v1/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': env.INTERNAL_SERVICE_KEY as string,
      },
      body: JSON.stringify({
        agent_id: input.agentId,
        action_type: 'trade',
        venue: 'kraken-spot',
        amount: input.amountUsdScaled.toString(),
        token_in: 'USD',
        token_out: 'USD',
        eip712_domain: {
          name: 'PolicyMint',
          version: '1',
          chainId: env.CHAIN_ID,
          verifyingContract: env.RISK_ROUTER_ADDRESS,
        },
        params: {
          pair: input.symbol,
          side: input.direction,
          amount_usd_scaled: input.amountUsdScaled.toString(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Evaluate API failed with status ${response.status}`);
    }

    return (await response.json()) as EvaluateApiResponse;
  }

  private async resolveSpendCapUsd(agentId: string): Promise<number> {
    const spendPolicy = await prisma.policy.findFirst({
      where: {
        agentId,
        type: PolicyType.SPEND_CAP_PER_TX,
        isActive: true,
        deletedAt: null,
      },
      select: { params: true },
    });

    const maxAmountUsd = Number((spendPolicy?.params as Record<string, unknown> | null)?.max_amount_usd ?? Number.NaN);
    if (!Number.isFinite(maxAmountUsd) || maxAmountUsd <= 0) {
      return DEFAULT_SPEND_CAP_PER_TX_USD;
    }

    return Math.min(maxAmountUsd, DEFAULT_SPEND_CAP_PER_TX_USD);
  }

  private floorToSixDecimals(value: number): number {
    return Math.floor(value * 1_000_000) / 1_000_000;
  }

  private toLegacyTradeIntent(input: {
    signalAction: 'buy' | 'sell';
    signalReason: string;
    btcVolume: number;
  }): EvaluateIntentInput {
    const agentId = env.AGENT_ID;
    if (!agentId) {
      throw new Error('AGENT_ID is not configured');
    }

    const btcMicro = Math.round(input.btcVolume * 1_000_000);
    const amountWei = (BigInt(btcMicro) * 1_000_000_000_000n).toString();

    return {
      agent_id: agentId,
      action_type: 'trade',
      venue: 'kraken-spot',
      amount: amountWei,
      token_in: 'BTC',
      token_out: 'USD',
      eip712_domain: {
        name: 'PolicyMint',
        version: '1',
        chainId: env.CHAIN_ID,
        verifyingContract: env.RISK_ROUTER_ADDRESS,
      },
      params: {
        pair: 'BTC/USD',
        side: input.signalAction,
        btc_volume: input.btcVolume,
        signal_reason: input.signalReason,
      },
    };
  }
}
