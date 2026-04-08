import { describe, expect, it } from 'vitest';
import { computeAmountUsdScaled } from './position-sizing.js';

describe('computeAmountUsdScaled', () => {
  it('enforces hard cap at $450 and converts to 1e6 scale', () => {
    const value = computeAmountUsdScaled({
      spendCapPerTxUsd: 1000,
      drawdownRiskScore: 0,
      confidence: 1,
    });

    expect(value).toBe(BigInt(450_000_000));
  });

  it('enforces minimum floor at $10', () => {
    const value = computeAmountUsdScaled({
      spendCapPerTxUsd: 50,
      drawdownRiskScore: 1,
      confidence: 1,
    });

    expect(value).toBe(BigInt(10_000_000));
  });

  it('halves position for low confidence and keeps floor', () => {
    const value = computeAmountUsdScaled({
      spendCapPerTxUsd: 100,
      drawdownRiskScore: 0,
      confidence: 0.5,
    });

    expect(value).toBe(BigInt(50_000_000));
  });

  it('applies drawdown scaling before conversion', () => {
    const value = computeAmountUsdScaled({
      spendCapPerTxUsd: 200,
      drawdownRiskScore: 0.25,
      confidence: 1,
    });

    expect(value).toBe(BigInt(150_000_000));
  });
});
