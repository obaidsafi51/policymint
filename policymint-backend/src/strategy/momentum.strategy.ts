import { env } from '../config/env.js';
import { EMACalculator } from './ema.js';
import type { IStrategy, StrategySignal } from './strategy.interface.js';

const DEFAULT_PAIR = 'BTC/USD';
const SHORT_EMA_PERIOD = 5;
const LONG_EMA_PERIOD = 20;

type PreviousSignalState = 'buy' | 'sell' | 'none';

export class MomentumStrategy implements IStrategy {
  private readonly shortEma = new EMACalculator(SHORT_EMA_PERIOD);
  private readonly longEma = new EMACalculator(LONG_EMA_PERIOD);
  private prevSignal: PreviousSignalState = 'none';

  onPrice(price: number): StrategySignal {
    const shortValue = this.shortEma.update(price);
    const longValue = this.longEma.update(price);

    if (shortValue === null || longValue === null) {
      return {
        action: 'hold',
        pair: DEFAULT_PAIR,
        amountUsd: 0,
        reason: 'EMA not yet seeded',
      };
    }

    if (shortValue > longValue && this.prevSignal !== 'buy') {
      this.prevSignal = 'buy';
      return {
        action: 'buy',
        pair: DEFAULT_PAIR,
        amountUsd: env.STRATEGY_TRADE_AMOUNT_USD,
        reason: `EMA crossover bullish (short ${shortValue.toFixed(2)} > long ${longValue.toFixed(2)})`,
      };
    }

    if (shortValue < longValue && this.prevSignal !== 'sell') {
      this.prevSignal = 'sell';
      return {
        action: 'sell',
        pair: DEFAULT_PAIR,
        amountUsd: env.STRATEGY_TRADE_AMOUNT_USD,
        reason: `EMA crossover bearish (short ${shortValue.toFixed(2)} < long ${longValue.toFixed(2)})`,
      };
    }

    return {
      action: 'hold',
      pair: DEFAULT_PAIR,
      amountUsd: 0,
      reason: 'No crossover transition',
    };
  }

  reset(): void {
    this.shortEma.reset();
    this.longEma.reset();
    this.prevSignal = 'none';
  }
}
