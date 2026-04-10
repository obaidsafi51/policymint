import { describe, expect, it, vi } from 'vitest';
import { StrategyLoop } from '../../src/agent/loop';
import { PRISMAPIError } from '../../src/strategy/prism-signal-provider';

vi.mock('../../src/db/client.js', () => ({
  prisma: {
    agent: {
      findUnique: vi.fn(async () => ({
        id: process.env.AGENT_ID,
        isActive: true,
        erc8004TokenId: '123',
      })),
    },
  },
}));

describe('StrategyLoop', () => {
  process.env.AGENT_ID = process.env.AGENT_ID ?? '018f5f93-1ecf-7cc0-bf2f-0d72f12a9c1b';

  function createLoopHarness() {
    const signalProvider = {
      resolveSymbol: vi.fn(async () => 'BTC/USD'),
      getSignal: vi.fn(async () => ({ direction: 'buy' as const, confidence: 0.8 })),
      getRisk: vi.fn(async () => ({ volatilityScore: 0.3, drawdownRiskScore: 0.2 })),
    };
    const evaluateIntentFn = vi.fn();

    const loop = new StrategyLoop({
      signalProvider,
      evaluateIntentFn,
    });

    return {
      loop,
      signalProvider,
      evaluateIntentFn,
    };
  }

  it('skips evaluate when PRISM returns neutral signal', async () => {
    const { loop, signalProvider, evaluateIntentFn } = createLoopHarness();
    signalProvider.getSignal.mockResolvedValue({ direction: 'neutral', confidence: 0.8 });
    await loop.start();
    await loop.tick();
    await loop.stop();

    expect(evaluateIntentFn).not.toHaveBeenCalled();
  });

  it('skips evaluate when PRISM confidence is low', async () => {
    const { loop, signalProvider, evaluateIntentFn } = createLoopHarness();
    signalProvider.getSignal.mockResolvedValue({ direction: 'buy', confidence: 0.4 });
    await loop.start();
    await loop.tick();
    await loop.stop();

    expect(evaluateIntentFn).not.toHaveBeenCalled();
  });

  it('calls evaluate when PRISM signal is actionable', async () => {
    const { loop, evaluateIntentFn } = createLoopHarness();

    evaluateIntentFn.mockResolvedValue({
      result: 'allow',
      reason: null,
      policy_id: null,
      evaluation_id: 'eval-1',
      eip712_signed_intent: '0xabc',
      riskIntentForExecution: null,
    });

    (loop as unknown as { started: boolean }).started = true;
    await loop.tick();

    expect(evaluateIntentFn).toHaveBeenCalledTimes(1);
  });

  it('builds intent with pair and side field', async () => {
    const { loop, signalProvider, evaluateIntentFn } = createLoopHarness();
    signalProvider.getSignal.mockResolvedValue({ direction: 'sell', confidence: 0.9 });

    evaluateIntentFn.mockResolvedValue({
      result: 'block',
      reason: 'blocked for test',
      policy_id: 'policy-1',
      evaluation_id: 'eval-side',
      eip712_signed_intent: '0xabc',
      riskIntentForExecution: null,
    });

    (loop as unknown as { started: boolean }).started = true;
    await loop.tick();

    expect(evaluateIntentFn).toHaveBeenCalledTimes(1);
    const intentArg = evaluateIntentFn.mock.calls[0]?.[0];
    expect(intentArg?.token_in).toBe('USDC');
    expect(intentArg?.token_out).toBe('USD');
    expect(intentArg?.params).toMatchObject({ side: 'sell', pair: 'BTC/USD' });
  });

  it('skips PRISM requests while paused backoff is active', async () => {
    const { loop, signalProvider, evaluateIntentFn } = createLoopHarness();
    signalProvider.getSignal.mockRejectedValue(new PRISMAPIError('down', 503, '/signals/BTC%2FUSD'));

    (loop as unknown as { started: boolean }).started = true;
    await loop.tick();
    await loop.tick();
    await loop.tick();
    await loop.tick();

    const pausedResolveCalls = signalProvider.resolveSymbol.mock.calls.length;
    await loop.tick();

    expect(signalProvider.resolveSymbol.mock.calls.length).toBe(pausedResolveCalls);
    expect(evaluateIntentFn).not.toHaveBeenCalled();
  });
});
