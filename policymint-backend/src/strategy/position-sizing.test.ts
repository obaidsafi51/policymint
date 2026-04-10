import { describe, expect, it } from 'vitest';
import { computePositionSizing } from './position-sizing';

describe('computePositionSizing', () => {
  it('applies drawdown reduction and scales to 1e6', () => {
    const result = computePositionSizing({
      spendCapPerTxUsd: 450,
      drawdownRiskScore: 0.2,
      confidence: 0.9,
    });

    expect(result.usdAmount).toBe(360);
    expect(result.amountUsdScaled).toBe(BigInt(360_000_000));
  });

  it('halves position for low confidence', () => {
    const result = computePositionSizing({
      spendCapPerTxUsd: 450,
      drawdownRiskScore: 0.2,
      confidence: 0.59,
    });

    expect(result.usdAmount).toBe(180);
    expect(result.amountUsdScaled).toBe(BigInt(180_000_000));
  });

  it('enforces floor and ceiling', () => {
    const floor = computePositionSizing({
      spendCapPerTxUsd: 450,
      drawdownRiskScore: 0.99,
      confidence: 0.3,
    });

    const ceiling = computePositionSizing({
      spendCapPerTxUsd: 999,
      drawdownRiskScore: 0,
      confidence: 1,
    });

    expect(floor.usdAmount).toBe(10);
    expect(floor.amountUsdScaled).toBe(BigInt(10_000_000));
    expect(ceiling.usdAmount).toBe(450);
    expect(ceiling.amountUsdScaled).toBe(BigInt(450_000_000));
  });

  it('does not exceed configured cap when cap is below minimum floor', () => {
    const result = computePositionSizing({
      spendCapPerTxUsd: 5,
      drawdownRiskScore: 0,
      confidence: 1,
    });

    expect(result.usdAmount).toBe(5);
    expect(result.amountUsdScaled).toBe(BigInt(5_000_000));
  });
});
