export interface SignalPayload {
  direction: 'buy' | 'sell' | 'neutral';
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface RiskPayload {
  volatilityScore: number;
  drawdownRiskScore: number;
  metadata?: Record<string, unknown>;
}

export interface SignalProvider {
  resolveSymbol(asset: string): Promise<string>;
  getSignal(symbol: string): Promise<SignalPayload>;
  getRisk(symbol: string): Promise<RiskPayload>;
}

export class PRISMAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
  }
}
