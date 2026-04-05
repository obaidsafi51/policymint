import { describe, expect, it } from 'vitest';
import { MomentumStrategy } from './momentum.strategy';

describe('MomentumStrategy', () => {
  it('returns hold while EMA values are being seeded', () => {
    const strategy = new MomentumStrategy();

    for (let i = 0; i < 19; i += 1) {
      const signal = strategy.onPrice(100);
      expect(signal.action).toBe('hold');
      expect(signal.reason).toContain('EMA not yet seeded');
    }
  });

  it('emits buy once on bullish crossover and then holds while still above', () => {
    const strategy = new MomentumStrategy();

    for (let i = 0; i < 20; i += 1) {
      strategy.onPrice(100);
    }

    const buy = strategy.onPrice(120);
    expect(buy.action).toBe('buy');

    const hold = strategy.onPrice(121);
    expect(hold.action).toBe('hold');
  });

  it('emits sell once when crossover turns bearish', () => {
    const strategy = new MomentumStrategy();

    for (let i = 0; i < 20; i += 1) {
      strategy.onPrice(100);
    }

    strategy.onPrice(120);

    let sellSignal = strategy.onPrice(80);
    for (let i = 0; i < 15 && sellSignal.action !== 'sell'; i += 1) {
      sellSignal = strategy.onPrice(80);
    }

    expect(sellSignal.action).toBe('sell');

    const holdAfterSell = strategy.onPrice(80);
    expect(holdAfterSell.action).toBe('hold');
  });

  it('does not emit buy repeatedly until a sell transition occurs', () => {
    const strategy = new MomentumStrategy();

    for (let i = 0; i < 20; i += 1) {
      strategy.onPrice(100);
    }

    const firstBuy = strategy.onPrice(120);
    const secondBuyAttempt = strategy.onPrice(122);

    expect(firstBuy.action).toBe('buy');
    expect(secondBuyAttempt.action).toBe('hold');
  });
});
