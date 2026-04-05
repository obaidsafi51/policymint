import { describe, expect, it, vi } from 'vitest';
import { StrategyLoop } from '../../src/agent/loop';

describe('StrategyLoop', () => {
  function createLoopHarness() {
    const strategy = { onPrice: vi.fn(), reset: vi.fn() };
    const krakenAdapter = {
      paperInit: vi.fn(async () => ({ success: true, stdout: '', stderr: '', exitCode: 0, timedOut: false })),
      paperBuy: vi.fn(async () => ({ success: true, stdout: '', stderr: '', exitCode: 0, timedOut: false })),
      paperSell: vi.fn(async () => ({ success: true, stdout: '', stderr: '', exitCode: 0, timedOut: false })),
      cleanup: vi.fn(),
    };
    const evaluateIntentFn = vi.fn();
    const priceFeed = {
      connect: vi.fn(async () => {}),
      disconnect: vi.fn(),
    };

    const loop = new StrategyLoop({
      strategy,
      krakenAdapter: krakenAdapter as never,
      evaluateIntentFn,
      createPriceFeed: () => priceFeed,
    });

    return {
      loop,
      strategy,
      krakenAdapter,
      evaluateIntentFn,
      priceFeed,
    };
  }

  it('skips evaluate when strategy returns hold', async () => {
    const { loop, strategy, evaluateIntentFn } = createLoopHarness();
    await loop.start();

    strategy.onPrice.mockReturnValue({
      action: 'hold',
      pair: 'BTC/USD',
      amountUsd: 0,
      reason: 'EMA not yet seeded',
    });

    await loop.processSignal(100_000);

    expect(evaluateIntentFn).not.toHaveBeenCalled();
  });

  it('skips evaluate when buy volume is below Kraken minimum', async () => {
    const { loop, strategy, evaluateIntentFn } = createLoopHarness();
    await loop.start();

    strategy.onPrice.mockReturnValue({
      action: 'buy',
      pair: 'BTC/USD',
      amountUsd: 5,
      reason: 'test',
    });

    await loop.processSignal(100_000);

    expect(evaluateIntentFn).not.toHaveBeenCalled();
  });

  it('calls evaluate then paperBuy when result is allow', async () => {
    const { loop, strategy, evaluateIntentFn, krakenAdapter } = createLoopHarness();
    await loop.start();

    strategy.onPrice.mockReturnValue({
      action: 'buy',
      pair: 'BTC/USD',
      amountUsd: 100,
      reason: 'bullish crossover',
    });

    evaluateIntentFn.mockResolvedValue({
      result: 'allow',
      reason: null,
      policy_id: null,
      evaluation_id: 'eval-1',
      eip712_signed_intent: '0xabc',
      riskIntentForExecution: null,
    });

    await loop.processSignal(100_000);

    expect(evaluateIntentFn).toHaveBeenCalledTimes(1);
    expect(krakenAdapter.paperBuy).toHaveBeenCalledTimes(1);
    expect(krakenAdapter.paperBuy).toHaveBeenCalledWith('BTCUSD', 0.001);
  });

  it('builds intent with side field for sell signals', async () => {
    const { loop, strategy, evaluateIntentFn } = createLoopHarness();
    await loop.start();

    strategy.onPrice.mockReturnValue({
      action: 'sell',
      pair: 'BTC/USD',
      amountUsd: 100,
      reason: 'bearish crossover',
    });

    evaluateIntentFn.mockResolvedValue({
      result: 'block',
      reason: 'blocked for test',
      policy_id: 'policy-1',
      evaluation_id: 'eval-side',
      eip712_signed_intent: '0xabc',
      riskIntentForExecution: null,
    });

    await loop.processSignal(100_000);

    expect(evaluateIntentFn).toHaveBeenCalledTimes(1);
    const intentArg = evaluateIntentFn.mock.calls[0]?.[0];
    expect(intentArg?.token_in).toBe('BTC');
    expect(intentArg?.token_out).toBe('USD');
    expect(intentArg?.params).toMatchObject({ side: 'sell', pair: 'BTC/USD' });
  });

  it('drops concurrent ticks while processing is in-flight', async () => {
    const { loop, strategy, evaluateIntentFn } = createLoopHarness();
    await loop.start();

    strategy.onPrice.mockReturnValue({
      action: 'buy',
      pair: 'BTC/USD',
      amountUsd: 100,
      reason: 'bullish crossover',
    });

    let resolveEvaluation: ((value: unknown) => void) | null = null;
    evaluateIntentFn.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveEvaluation = resolve;
        }),
    );

    (loop as unknown as { onPrice: (price: number) => void }).onPrice(100_000);
    (loop as unknown as { onPrice: (price: number) => void }).onPrice(100_000);

    expect(evaluateIntentFn).toHaveBeenCalledTimes(1);

    resolveEvaluation?.({
      result: 'block',
      reason: 'blocked',
      policy_id: 'policy-1',
      evaluation_id: 'eval-2',
      eip712_signed_intent: '0xabc',
      riskIntentForExecution: null,
    });

    await Promise.resolve();
    await Promise.resolve();
  });

  it('continues processing after evaluate service throws', async () => {
    const { loop, strategy, evaluateIntentFn, krakenAdapter } = createLoopHarness();
    await loop.start();

    strategy.onPrice.mockReturnValue({
      action: 'buy',
      pair: 'BTC/USD',
      amountUsd: 100,
      reason: 'bullish crossover',
    });

    evaluateIntentFn
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({
        result: 'allow',
        reason: null,
        policy_id: null,
        evaluation_id: 'eval-3',
        eip712_signed_intent: '0xabc',
        riskIntentForExecution: null,
      });

    await loop.processSignal(100_000);
    await loop.processSignal(100_000);

    expect(evaluateIntentFn).toHaveBeenCalledTimes(2);
    expect(krakenAdapter.paperBuy).toHaveBeenCalledTimes(1);
  });
});
