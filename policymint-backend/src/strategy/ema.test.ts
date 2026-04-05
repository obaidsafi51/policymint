import { describe, expect, it } from 'vitest';
import { EMACalculator } from './ema';

describe('EMACalculator', () => {
  it('returns null for the first period-1 updates', () => {
    const ema = new EMACalculator(5);

    expect(ema.update(100)).toBeNull();
    expect(ema.update(101)).toBeNull();
    expect(ema.update(102)).toBeNull();
    expect(ema.update(103)).toBeNull();
  });

  it('returns seeded EMA on the period-th update', () => {
    const ema = new EMACalculator(5);

    ema.update(100);
    ema.update(110);
    ema.update(120);
    ema.update(130);
    const value = ema.update(140);

    expect(value).not.toBeNull();
    expect(value).toBe(120);
  });

  it('decreases when subsequent prices are lower than current EMA', () => {
    const ema = new EMACalculator(3);

    ema.update(100);
    ema.update(100);
    const seeded = ema.update(100);
    const lowered = ema.update(90);

    expect(seeded).toBe(100);
    expect(lowered).toBeLessThan(seeded as number);
  });

  it('reset clears the seeded state', () => {
    const ema = new EMACalculator(3);

    ema.update(100);
    ema.update(100);
    ema.update(100);
    expect(ema.getValue()).toBe(100);

    ema.reset();

    expect(ema.getValue()).toBeNull();
    expect(ema.update(100)).toBeNull();
  });
});
