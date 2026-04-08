import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SignalProvider } from './signal-provider.js';

const envState = vi.hoisted(() => ({
  AGENT_ID: 'agent-1' as string | undefined,
  INTERNAL_SERVICE_KEY: 'internal-key' as string | undefined,
  STRATEGY_TICK_INTERVAL_MS: 5_000,
  PORT: 3000,
  CHAIN_ID: 11155111,
  RISK_ROUTER_ADDRESS: '0x1111111111111111111111111111111111111111' as `0x${string}`,
}));

const findUniqueMock = vi.hoisted(() => vi.fn());
const findFirstPolicyMock = vi.hoisted(() => vi.fn());
const computeAmountUsdScaledMock = vi.hoisted(() => vi.fn());
const captureErrorMock = vi.hoisted(() => vi.fn());
const evaluateIntentMock = vi.hoisted(() => vi.fn());

vi.mock('../config/env.js', () => ({ env: envState }));
vi.mock('../db/client.js', () => ({
  prisma: {
    agent: { findUnique: findUniqueMock },
    policy: { findFirst: findFirstPolicyMock },
  },
}));
vi.mock('../modules/policy-engine/evaluate.service.js', () => ({
  evaluateIntent: evaluateIntentMock,
}));
vi.mock('./position-sizing.js', () => ({
  computeAmountUsdScaled: computeAmountUsdScaledMock,
}));
vi.mock('../lib/sentry.js', () => ({
  captureError: captureErrorMock,
}));

function createProvider(): SignalProvider & {
  resolveSymbol: ReturnType<typeof vi.fn>;
  getSignal: ReturnType<typeof vi.fn>;
  getRisk: ReturnType<typeof vi.fn>;
} {
  return {
    resolveSymbol: vi.fn(async () => 'BTC/USD'),
    getSignal: vi.fn(async () => ({ direction: 'neutral', confidence: 0.5 })),
    getRisk: vi.fn(async () => ({ volatilityScore: 0.2, drawdownRiskScore: 0.3 })),
  };
}

function createLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('StrategyLoop PRISM mode', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    envState.AGENT_ID = 'agent-1';
    envState.INTERNAL_SERVICE_KEY = 'internal-key';
    findUniqueMock.mockResolvedValue({ id: 'agent-1', isActive: true, erc8004TokenId: '42' });
    findFirstPolicyMock.mockResolvedValue({ params: { max_amount_usd: 300 } });
    computeAmountUsdScaledMock.mockReturnValue(BigInt(123_000_000));

    vi.spyOn(globalThis, 'setInterval').mockImplementation((() => ({}) as any) as any);
    vi.spyOn(globalThis, 'clearInterval').mockImplementation((() => undefined) as any);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          result: 'allow',
          reason: null,
          policy_id: null,
          evaluation_id: 'eval-1',
          eip712_signed_intent: '0xabc',
        }),
      })),
    );
  });

  it('does not start when AGENT_ID is missing', async () => {
    envState.AGENT_ID = undefined;
    const provider = createProvider();
    const logger = createLogger();
    const { StrategyLoop } = await import('./loop.js');
    const loop = new StrategyLoop({ signalProvider: provider, logger: logger as any });

    await loop.start();

    expect(logger.warn).toHaveBeenCalledWith({ event: 'STRATEGY_LOOP_DISABLED' }, 'AGENT_ID not set; strategy loop disabled');
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it('does not start when INTERNAL_SERVICE_KEY is missing', async () => {
    envState.INTERNAL_SERVICE_KEY = undefined;
    const provider = createProvider();
    const logger = createLogger();
    const { StrategyLoop } = await import('./loop.js');
    const loop = new StrategyLoop({ signalProvider: provider, logger: logger as any });

    await loop.start();

    expect(logger.warn).toHaveBeenCalledWith(
      { event: 'STRATEGY_LOOP_DISABLED' },
      'INTERNAL_SERVICE_KEY not set; strategy loop cannot call /v1/evaluate',
    );
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it('skips tick when signal is neutral', async () => {
    const provider = createProvider();
    provider.getSignal.mockResolvedValue({ direction: 'neutral', confidence: 0.9 });
    const logger = createLogger();
    const { StrategyLoop } = await import('./loop.js');
    const loop = new StrategyLoop({ signalProvider: provider, logger: logger as any });

    await loop.start();

    expect(provider.resolveSymbol).toHaveBeenCalledWith('BTC');
    expect(provider.getSignal).toHaveBeenCalledWith('BTC/USD');
    expect(provider.getRisk).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('submits evaluation when signal is confident and directional', async () => {
    const provider = createProvider();
    provider.getSignal.mockResolvedValue({ direction: 'buy', confidence: 0.91 });
    const logger = createLogger();
    const { StrategyLoop } = await import('./loop.js');
    const loop = new StrategyLoop({ signalProvider: provider, logger: logger as any });

    await loop.start();

    expect(provider.getRisk).toHaveBeenCalledWith('BTC/USD');
    expect(computeAmountUsdScaledMock).toHaveBeenCalledWith({
      spendCapPerTxUsd: 300,
      drawdownRiskScore: 0.3,
      confidence: 0.91,
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('pauses after PRISM errors and resumes after recovery', async () => {
    const { PRISMAPIError } = await import('./signal-provider.js');
    const provider = createProvider();
    provider.getSignal
      .mockRejectedValueOnce(new PRISMAPIError('upstream failure', 502))
      .mockRejectedValueOnce(new PRISMAPIError('upstream failure', 502))
      .mockRejectedValueOnce(new PRISMAPIError('upstream failure', 502))
      .mockResolvedValueOnce({ direction: 'neutral', confidence: 0.9 });
    const logger = createLogger();
    const { StrategyLoop } = await import('./loop.js');
    const loop = new StrategyLoop({ signalProvider: provider, logger: logger as any });

    await loop.start();
    await loop.onPrice(100_000);
    await flush();
    await loop.onPrice(100_000);
    await flush();
    await loop.onPrice(100_000);
    await flush();

    expect(captureErrorMock).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      { event: 'PRISM_CRITICAL_OUTAGE', streak: 3 },
      'PRISM API failure streak exceeded threshold; pausing strategy loop until recovery',
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();

    await loop.onPrice(100_000);
    await flush();

    expect(logger.info).toHaveBeenCalledWith({ event: 'PRISM_LOOP_RESUMED' }, 'PRISM recovered; strategy loop resumed');
  });
});
