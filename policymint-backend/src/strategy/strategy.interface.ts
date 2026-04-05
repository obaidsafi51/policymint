export interface StrategySignal {
  action: 'buy' | 'sell' | 'hold';
  pair: string;
  amountUsd: number;
  reason: string;
}

export interface IStrategy {
  onPrice(price: number): StrategySignal;
  reset(): void;
}
