import { describe, expect, it } from 'vitest';
import { evaluateVenueAllowlist } from '../../../../src/modules/policy-engine/evaluators/venue-allowlist';
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
    chainId: 11155111,
    verifyingContract: '0x0000000000000000000000000000000000000000'
  },
  params: {}
};

describe('evaluateVenueAllowlist (unit map)', () => {
  it('allows exact match', () => {
    expect(evaluateVenueAllowlist(baseIntent, { allowed_venues: ['kraken-spot'] }).passed).toBe(true);
  });

  it('allows case-insensitive match', () => {
    expect(evaluateVenueAllowlist(baseIntent, { allowed_venues: ['Kraken-Spot'] }).passed).toBe(true);
  });

  it('blocks when not allowlisted', () => {
    const result = evaluateVenueAllowlist(baseIntent, { allowed_venues: ['uniswap-v3'] });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('kraken-spot');
  });

  it('blocks on empty allowlist', () => {
    expect(evaluateVenueAllowlist(baseIntent, { allowed_venues: [] }).passed).toBe(false);
  });

  it('blocks on null or undefined allowed_venues', () => {
    expect(evaluateVenueAllowlist(baseIntent, { allowed_venues: null }).passed).toBe(false);
    expect(evaluateVenueAllowlist(baseIntent, { allowed_venues: undefined }).passed).toBe(false);
  });

  it('blocks when params is null', () => {
    expect(evaluateVenueAllowlist(baseIntent, null).passed).toBe(false);
  });
});
