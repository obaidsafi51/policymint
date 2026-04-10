import { env } from '../config/env.js';
import { captureError } from '../lib/sentry.js';
import type { RiskPayload, SignalPayload, SignalProvider } from './signal-provider.js';
import { PRISMAPIError } from './signal-provider.js';

const RESOLVE_CACHE_TTL_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5000;

export class PRISMSignalProvider implements SignalProvider {
  private readonly resolveCache = new Map<string, { symbol: string; expiresAt: number }>();

  async resolveSymbol(asset: string): Promise<string> {
    const key = asset.trim().toUpperCase();
    const cached = this.resolveCache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.symbol;
    }

    const payload = await this.request(`/resolve/${encodeURIComponent(key)}`);
    const symbolValue = payload.symbol ?? payload.canonicalSymbol ?? payload.canonical_symbol;

    if (typeof symbolValue !== 'string' || symbolValue.length === 0) {
      throw new PRISMAPIError(`PRISM /resolve returned invalid symbol for asset ${asset}`);
    }

    this.resolveCache.set(key, {
      symbol: symbolValue,
      expiresAt: Date.now() + RESOLVE_CACHE_TTL_MS,
    });

    return symbolValue;
  }

  async getSignal(symbol: string): Promise<SignalPayload> {
    const payload = await this.request(`/signals/${encodeURIComponent(symbol)}`);
    const rawDirection = String(payload.direction ?? payload.signal ?? payload.sentiment ?? 'neutral').toLowerCase();
    const rawConfidence = Number(payload.confidence ?? payload.score ?? 0);

    const direction: SignalPayload['direction'] =
      rawDirection === 'bullish' || rawDirection === 'buy'
        ? 'buy'
        : rawDirection === 'bearish' || rawDirection === 'sell'
        ? 'sell'
        : 'neutral';

    return {
      direction,
      confidence: Number.isFinite(rawConfidence) ? Math.min(Math.max(rawConfidence, 0), 1) : 0,
      metadata: payload,
    };
  }

  async getRisk(symbol: string): Promise<RiskPayload> {
    const payload = await this.request(`/risk/${encodeURIComponent(symbol)}`);
    const volatility = Number(payload.volatilityScore ?? payload.volatility ?? payload.volatility_score ?? 0);
    const drawdown = Number(payload.drawdownRiskScore ?? payload.drawdown ?? payload.drawdown_risk_score ?? 0);

    return {
      volatilityScore: Number.isFinite(volatility) ? Math.min(Math.max(volatility, 0), 1) : 0,
      drawdownRiskScore: Number.isFinite(drawdown) ? Math.min(Math.max(drawdown, 0), 1) : 0,
      metadata: payload,
    };
  }

  private async request(path: string): Promise<Record<string, unknown>> {
    const url = `${env.PRISM_BASE_URL.replace(/\/$/, '')}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${env.PRISM_API_KEY}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = `PRISM request failed: ${response.status} ${response.statusText} for ${path}`;
        throw new PRISMAPIError(message, response.status);
      }

      const payload = (await response.json()) as Record<string, unknown>;
      return payload;
    } catch (error) {
      if (error instanceof PRISMAPIError) {
        captureError(error, { provider: 'prism', path });
        throw error;
      }

      const wrapped = new PRISMAPIError(
        `PRISM request error for ${path}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      captureError(wrapped, { provider: 'prism', path });
      throw wrapped;
    } finally {
      clearTimeout(timeout);
    }
  }
}
