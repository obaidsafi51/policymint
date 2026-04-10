export type SignalDirection = 'buy' | 'sell' | 'neutral';

export interface SignalResult {
  direction: SignalDirection;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface RiskResult {
  volatilityScore: number;
  drawdownRiskScore: number;
  metadata?: Record<string, unknown>;
}

export interface SignalProvider {
  resolveSymbol(asset: string): Promise<string>;
  getSignal(symbol: string): Promise<SignalResult>;
  getRisk(symbol: string): Promise<RiskResult>;
}
