import { describe, expect, it } from 'vitest';
import { CreatePolicySchema } from '../../../src/modules/policies/policy.schema';

const AGENT_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('CreatePolicySchema', () => {
  it('accepts spend cap policy up to $450 and injects default', () => {
    const parsed = CreatePolicySchema.parse({
      agentId: AGENT_ID,
      type: 'SPEND_CAP_PER_TX',
      params: {
        max_amount_wei: '1000000000000000000',
      },
    });

    expect(parsed.params.max_amount_usd).toBe(450);
  });

  it('rejects spend cap policy above $450', () => {
    const parsed = CreatePolicySchema.safeParse({
      agentId: AGENT_ID,
      type: 'SPEND_CAP_PER_TX',
      params: {
        max_amount_wei: '1000000000000000000',
        max_amount_usd: 451,
      },
    });

    expect(parsed.success).toBe(false);
  });

  it('accepts daily loss policy up to 4% and injects default', () => {
    const parsed = CreatePolicySchema.parse({
      agentId: AGENT_ID,
      type: 'DAILY_LOSS_BUDGET',
      params: {
        max_daily_loss_wei: '5000000000000000000',
      },
    });

    expect(parsed.params.max_daily_loss_percent).toBe(4);
  });

  it('rejects daily loss policy above 4%', () => {
    const parsed = CreatePolicySchema.safeParse({
      agentId: AGENT_ID,
      type: 'DAILY_LOSS_BUDGET',
      params: {
        max_daily_loss_wei: '5000000000000000000',
        max_daily_loss_percent: 4.1,
      },
    });

    expect(parsed.success).toBe(false);
  });
});
