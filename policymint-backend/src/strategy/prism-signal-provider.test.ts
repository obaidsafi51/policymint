import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.PRISM_API_KEY = process.env.PRISM_API_KEY ?? 'prism_sk_test_key';
process.env.PRISM_BASE_URL = process.env.PRISM_BASE_URL ?? 'https://api.prismapi.ai';

const fetchMock = vi.fn();

describe('PRISMSignalProvider', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('caches resolveSymbol for one hour', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ symbol: 'BTC/USD' }),
    });

    const { PRISMSignalProvider } = await import('./prism-signal-provider');
    const provider = new PRISMSignalProvider();

    const first = await provider.resolveSymbol('btc');
    const second = await provider.resolveSymbol('btc');

    expect(first).toBe('BTC/USD');
    expect(second).toBe('BTC/USD');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('normalizes bullish/bearish and confidence', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ direction: 'bullish', confidence: 0.72 }),
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ drawdown_risk_score: 0.35, volatility: 0.44 }),
    });

    const { PRISMSignalProvider } = await import('./prism-signal-provider');
    const provider = new PRISMSignalProvider();

    const signal = await provider.getSignal('BTC/USD');
    const risk = await provider.getRisk('BTC/USD');

    expect(signal.direction).toBe('buy');
    expect(signal.confidence).toBe(0.72);
    expect(risk.drawdownRiskScore).toBe(0.35);
    expect(risk.volatilityScore).toBe(0.44);
  });

  it('throws PRISMAPIError on non-200', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'down',
    });

    const { PRISMAPIError, PRISMSignalProvider } = await import('./prism-signal-provider');
    const provider = new PRISMSignalProvider();

    await expect(provider.getSignal('BTC/USD')).rejects.toBeInstanceOf(PRISMAPIError);
  });

  it('throws PRISMAPIError on request timeout', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));

    const { PRISMAPIError, PRISMSignalProvider } = await import('./prism-signal-provider');
    const provider = new PRISMSignalProvider();

    await expect(provider.getSignal('BTC/USD')).rejects.toBeInstanceOf(PRISMAPIError);
  });
});
