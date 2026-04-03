import { describe, expect, it } from 'vitest';
import { evaluateDailyLossBudget } from '../../../../src/modules/policy-engine/evaluators/daily-loss-budget';
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

describe('evaluateDailyLossBudget (unit map)', () => {
  it('allows when no prior spend and below cap', () => {
    expect(evaluateDailyLossBudget(baseIntent, { max_daily_loss_wei: '5000000000000000000' }, { currentDailyTotalWei: '0' }).passed).toBe(true);
  });

  it('allows when projected total equals cap', () => {
    expect(evaluateDailyLossBudget(baseIntent, { max_daily_loss_wei: '1500000000000000000' }, { currentDailyTotalWei: '500000000000000000' }).passed).toBe(true);
  });

  it('blocks when projected total exceeds by one wei', () => {
    expect(evaluateDailyLossBudget(baseIntent, { max_daily_loss_wei: '1000000000000000000' }, { currentDailyTotalWei: '1' }).passed).toBe(false);
  });

  it('blocks on simulated cumulative second call context', () => {
    expect(evaluateDailyLossBudget(baseIntent, { max_daily_loss_wei: '1500000000000000000' }, { currentDailyTotalWei: '1000000000000000000' }).passed).toBe(false);
  });

  it('blocks when max_daily_loss_wei missing or null', () => {
    expect(evaluateDailyLossBudget(baseIntent, {}, { currentDailyTotalWei: '0' }).passed).toBe(false);
    expect(evaluateDailyLossBudget(baseIntent, { max_daily_loss_wei: null }, { currentDailyTotalWei: '0' }).passed).toBe(false);
  });

  it('blocks when current daily total is invalid', () => {
    expect(evaluateDailyLossBudget(baseIntent, { max_daily_loss_wei: '1000' }, { currentDailyTotalWei: 'x' }).passed).toBe(false);
  });

  it('blocks when intent amount is invalid', () => {
    expect(evaluateDailyLossBudget({ ...baseIntent, amount: 'abc' }, { max_daily_loss_wei: '1000' }, { currentDailyTotalWei: '0' }).passed).toBe(false);
  });
});
