import { env } from '../config/env.js';
import { logger as sharedLogger } from '../lib/logger.js';
import { evaluateIntent } from '../modules/policy-engine/evaluate.service.js';
import type { EvaluateIntentInput } from '../modules/policy-engine/evaluate.schema.js';
import { KrakenAdapter } from '../exchange/kraken.js';
import { KrakenWebSocket } from '../strategy/kraken-ws.js';
import { MomentumStrategy } from '../strategy/momentum.strategy.js';
import type { IStrategy } from '../strategy/strategy.interface.js';

const MIN_BTC_VOLUME = 0.0001;

type EvaluateIntentResponse = Awaited<ReturnType<typeof evaluateIntent>>;
type EvaluateIntentFn = (intent: EvaluateIntentInput) => Promise<EvaluateIntentResponse>;

interface PriceFeed {
  connect(): Promise<void>;
  disconnect(): void;
}

interface StrategyLoopOptions {
  strategy?: IStrategy;
  krakenAdapter?: KrakenAdapter;
  evaluateIntentFn?: EvaluateIntentFn;
  createPriceFeed?: (onPrice: (price: number) => void) => PriceFeed;
  logger?: typeof sharedLogger;
}

export class StrategyLoop {
  private readonly strategy: IStrategy;
  private readonly krakenAdapter: KrakenAdapter;
  private readonly evaluateIntentFn: EvaluateIntentFn;
  private readonly logger: typeof sharedLogger;
  private readonly priceFeed: PriceFeed;

  private started = false;
  private isProcessing = false;

  constructor(options: StrategyLoopOptions = {}) {
    this.strategy = options.strategy ?? new MomentumStrategy();
    this.krakenAdapter = options.krakenAdapter ?? new KrakenAdapter();
    this.evaluateIntentFn = options.evaluateIntentFn ?? evaluateIntent;
    this.logger = options.logger ?? sharedLogger;
    this.priceFeed = options.createPriceFeed
      ? options.createPriceFeed((price) => this.onPrice(price))
      : new KrakenWebSocket((price) => this.onPrice(price));
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    if (!env.AGENT_ID) {
      this.logger.warn({ event: 'STRATEGY_LOOP_DISABLED' }, 'AGENT_ID not set; strategy loop disabled');
      return;
    }

    this.started = true;

    const initResult = await this.krakenAdapter.paperInit();
    if (!initResult.success) {
      this.logger.warn({
        event: 'PAPER_INIT_FAILED',
        stderr: initResult.stderr,
        exitCode: initResult.exitCode,
        timedOut: initResult.timedOut,
      }, 'Kraken paper account initialization failed; continuing');
    }

    await this.priceFeed.connect();
    this.logger.info({ event: 'STRATEGY_LOOP_STARTED' }, 'Strategy loop started');
  }

  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    this.started = false;
    this.priceFeed.disconnect();
    this.krakenAdapter.cleanup();
    this.strategy.reset();
    this.logger.info({ event: 'STRATEGY_LOOP_STOPPED' }, 'Strategy loop stopped');
  }

  async processSignal(price: number): Promise<void> {
    try {
      if (!this.started) {
        return;
      }

      const signal = this.strategy.onPrice(price);

      if (signal.action === 'hold') {
        return;
      }

      const btcVolume = this.floorToSixDecimals(signal.amountUsd / price);
      if (btcVolume < MIN_BTC_VOLUME) {
        this.logger.info({
          event: 'BELOW_MINIMUM_VOLUME',
          pair: signal.pair,
          amountUsd: signal.amountUsd,
          price,
          btcVolume,
        }, 'Skipping trade below Kraken BTC minimum volume');
        return;
      }

      const evaluation = await this.evaluateIntentFn(this.toTradeIntent({
        signalAction: signal.action,
        signalReason: signal.reason,
        btcVolume,
      }));

      if (evaluation.result === 'block') {
        this.logger.info({
          event: 'TRADE_BLOCKED',
          reason: evaluation.reason,
          evaluation_id: evaluation.evaluation_id,
        }, 'Trade blocked by policy engine');
        return;
      }

      if (!this.started) {
        return;
      }

      const cliPair = signal.pair.replace('/', '');
      const execution =
        signal.action === 'buy'
          ? await this.krakenAdapter.paperBuy(cliPair, btcVolume)
          : await this.krakenAdapter.paperSell(cliPair, btcVolume);

      this.logger.info({
        event: 'TRADE_EXECUTED',
        success: execution.success,
        pair: signal.pair,
        volume: btcVolume,
        price,
        evaluation_id: evaluation.evaluation_id,
      }, 'Paper trade execution completed');
    } catch (error) {
      this.logger.error({ err: error }, 'Strategy loop processing error');
    }
  }

  private onPrice(price: number): void {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    void this.processSignal(price).finally(() => {
      this.isProcessing = false;
    });
  }

  private floorToSixDecimals(value: number): number {
    return Math.floor(value * 1_000_000) / 1_000_000;
  }

  private toTradeIntent(input: {
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
