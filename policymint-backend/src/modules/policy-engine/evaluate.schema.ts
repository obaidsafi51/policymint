import { z } from 'zod';

const HexAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

export const EvaluateIntentSchema = z.object({
  agent_id: z.string().uuid(),
  action_type: z.enum(['swap', 'transfer', 'bridge', 'trade', 'custom']),
  venue: z.string().min(1),
  amount: z.string().min(1),
  token_in: z.string().min(1),
  token_out: z.string().min(1).optional(),
  eip712_domain: z.object({
    name: z.literal('PolicyMint'),
    version: z.literal('1'),
    chainId: z.number().int().positive(),
    verifyingContract: HexAddressSchema
  }),
  params: z.record(z.unknown())
});

export type EvaluateIntentInput = z.infer<typeof EvaluateIntentSchema>;
