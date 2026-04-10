import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import type { RiskResult, SignalProvider, SignalResult } from './signal-provider.interface.js';

const RESOLVE_CACHE_TTL_MS = 60 * 60 * 1000;

type ResolveCacheEntry = {
  symbol: string;
  expiresAt: number;
};

export class PRISMAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly endpoint: string,
  ) {
    super(message);
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function normalizeDirection(value: unknown): SignalResult['direction'] {
  const normalized = String(value ?? '').trim().toLowerCase();

  if (normalized === 'bullish' || normalized === 'buy' || normalized === 'long') {
    return 'buy';
  }

  if (normalized === 'bearish' || normalized === 'sell' || normalized === 'short') {
    return 'sell';
  }

  return 'neutral';
}

function pickString(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

function pickNumber(payload: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

export class PRISMSignalProvider implements SignalProvider {
  private readonly resolveCache = new Map<string, ResolveCacheEntry>();

  private get baseUrl() {
    return env.PRISM_BASE_URL.replace(/\/$/, '');
  }

  private get authHeader() {
    return `Bearer ${env.PRISM_API_KEY}`;
  }

  private async requestJson(endpoint: string): Promise<Record<string, unknown>> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: this.authHeader,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.error({ endpoint, status: response.status, body }, 'PRISM API request failed');
      throw new PRISMAPIError(`PRISM API request failed: ${response.status}`, response.status, endpoint);
    }

    const payload = (await response.json()) as unknown;

    if (!payload || typeof payload !== 'object') {
      throw new PRISMAPIError('PRISM API returned invalid payload', response.status, endpoint);
    }

    return payload as Record<string, unknown>;
  }

  async resolveSymbol(asset: string): Promise<string> {
    const normalizedAsset = asset.trim().toUpperCase();
    const cacheHit = this.resolveCache.get(normalizedAsset);

    if (cacheHit && cacheHit.expiresAt > Date.now()) {
      return cacheHit.symbol;
    }

    const payload = await this.requestJson(`/resolve/${encodeURIComponent(normalizedAsset)}`);
    const directSymbol = pickString(payload, ['symbol', 'canonicalSymbol', 'resolvedSymbol']);

    let symbol = directSymbol;
    if (!symbol && payload.data && typeof payload.data === 'object') {
      symbol = pickString(payload.data as Record<string, unknown>, ['symbol', 'canonicalSymbol', 'resolvedSymbol']);
    }

    if (!symbol) {
      throw new PRISMAPIError('PRISM /resolve response missing canonical symbol', 200, '/resolve');
    }

    this.resolveCache.set(normalizedAsset, {
      symbol,
      expiresAt: Date.now() + RESOLVE_CACHE_TTL_MS,
    });

    return symbol;
  }

  async getSignal(symbol: string): Promise<SignalResult> {
    const payload = await this.requestJson(`/signals/${encodeURIComponent(symbol)}`);
    const directDirection = pickString(payload, ['direction', 'signal', 'sentiment']);
    const directConfidence = pickNumber(payload, ['confidence', 'confidenceScore', 'score']);

    const data = payload.data && typeof payload.data === 'object'
      ? (payload.data as Record<string, unknown>)
      : null;

    const direction = normalizeDirection(directDirection ?? (data ? pickString(data, ['direction', 'signal', 'sentiment']) : null));
    const confidenceRaw = directConfidence ?? (data ? pickNumber(data, ['confidence', 'confidenceScore', 'score']) : null) ?? 0;

    return {
      direction,
      confidence: clamp01(confidenceRaw),
      metadata: payload,
    };
  }

  async getRisk(symbol: string): Promise<RiskResult> {
    const payload = await this.requestJson(`/risk/${encodeURIComponent(symbol)}`);

    const data = payload.data && typeof payload.data === 'object'
      ? (payload.data as Record<string, unknown>)
      : null;

    const volatilityRaw = pickNumber(payload, ['volatility', 'volatility_score', 'volatilityScore'])
      ?? (data ? pickNumber(data, ['volatility', 'volatility_score', 'volatilityScore']) : null)
      ?? 0;

    const drawdownRaw = pickNumber(payload, ['drawdown_risk_score', 'drawdownRiskScore', 'drawdown'])
      ?? (data ? pickNumber(data, ['drawdown_risk_score', 'drawdownRiskScore', 'drawdown']) : null)
      ?? 0;

    return {
      volatilityScore: clamp01(volatilityRaw),
      drawdownRiskScore: clamp01(drawdownRaw),
      metadata: payload,
    };
  }
}
