import { describe, expect, it } from 'vitest';
import { evaluateSpendCapPerTx } from '../../../../src/modules/policy-engine/evaluators/spend-cap-per-tx';
import type { EvaluateIntentInput } from '../../../../src/modules/policy-engine/evaluate.schema';

const baseIntent: EvaluateIntentInput = {
  agent_id: '550e8400-e29b-41d4-a716-446655440000',
  action_type: 'trade',
  venue: 'kraken-spot',
  amount: '1000000000000000000',
  token_in: 'ETH',
  eip712_domain: {
    name: 'PolicyMint',
    version: '1',
    chainId: 84532,
    verifyingContract: '0x0000000000000000000000000000000000000000'
  },
  params: {}
};

describe('evaluateSpendCapPerTx (unit map)', () => {
  it('allows at exact cap', () => {
    expect(evaluateSpendCapPerTx(baseIntent, { max_amount_wei: '1000000000000000000' }).passed).toBe(true);
  });

  it('allows one wei below cap', () => {
    expect(evaluateSpendCapPerTx(baseIntent, { max_amount_wei: '1000000000000000001' }).passed).toBe(true);
  });

  it('blocks one wei above cap', () => {
    expect(evaluateSpendCapPerTx(baseIntent, { max_amount_wei: '999999999999999999' }).passed).toBe(false);
  });

  it('blocks non-numeric amount', () => {
    expect(evaluateSpendCapPerTx({ ...baseIntent, amount: 'abc' }, { max_amount_wei: '5' }).passed).toBe(false);
  });

  it('blocks empty amount', () => {
    expect(evaluateSpendCapPerTx({ ...baseIntent, amount: '' }, { max_amount_wei: '5' }).passed).toBe(false);
  });

  it('blocks when cap is missing or null', () => {
    expect(evaluateSpendCapPerTx(baseIntent, {}).passed).toBe(false);
    expect(evaluateSpendCapPerTx(baseIntent, { max_amount_wei: null }).passed).toBe(false);
  });

  it('supports BigInt values above MAX_SAFE_INTEGER', () => {
    const amount = '99999999999999999999';
    expect(evaluateSpendCapPerTx({ ...baseIntent, amount }, { max_amount_wei: amount }).passed).toBe(true);
    expect(evaluateSpendCapPerTx({ ...baseIntent, amount }, { max_amount_wei: '99999999999999999998' }).passed).toBe(false);
  });
});
