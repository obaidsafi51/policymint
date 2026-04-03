import { z } from 'zod';

export const CreatePolicySchema = z.object({
  agentId: z.string().uuid(),
  type: z.enum(['VENUE_ALLOWLIST', 'SPEND_CAP_PER_TX', 'DAILY_LOSS_BUDGET']),
  params: z.record(z.any()),
  isActive: z.boolean().default(true)
});

export type CreatePolicyInput = z.infer<typeof CreatePolicySchema>;
