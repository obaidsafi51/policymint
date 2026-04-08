import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PRISMAPIError } from './signal-provider.js';
import { PRISMSignalProvider } from './prism-signal-provider.js';

describe('PRISMSignalProvider', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('caches resolveSymbol responses for repeated assets', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ symbol: 'BTC/USD' }), { status: 200 }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new PRISMSignalProvider();
    const first = await provider.resolveSymbol('btc');
    const second = await provider.resolveSymbol('BTC');

    expect(first).toBe('BTC/USD');
    expect(second).toBe('BTC/USD');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('normalizes getSignal response direction and confidence', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ direction: 'bullish', confidence: 0.82 }), { status: 200 }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new PRISMSignalProvider();
    const signal = await provider.getSignal('BTC/USD');

    expect(signal.direction).toBe('buy');
    expect(signal.confidence).toBeCloseTo(0.82);
  });

  it('parses getRisk response payload fields', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ volatility_score: 0.4, drawdown_risk_score: 0.25 }), { status: 200 }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new PRISMSignalProvider();
    const risk = await provider.getRisk('BTC/USD');

    expect(risk.volatilityScore).toBeCloseTo(0.4);
    expect(risk.drawdownRiskScore).toBeCloseTo(0.25);
  });

  it('throws PRISMAPIError on non-200 responses', async () => {
    const fetchMock = vi.fn(async () => new Response('unauthorized', { status: 401, statusText: 'Unauthorized' }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new PRISMSignalProvider();

    await expect(provider.getSignal('BTC/USD')).rejects.toBeInstanceOf(PRISMAPIError);
  });
});
