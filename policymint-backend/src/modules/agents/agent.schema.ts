import { z } from 'zod';

export const RegisterAgentSchema = z.object({
  name: z.string().min(2).max(100),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM address'),
  strategyType: z.enum(['MOMENTUM', 'REBALANCING', 'CUSTOM']).default('MOMENTUM'),
  chainId: z.number().int().default(11155111),
  metadataUri: z.string().url().optional()
});

export type RegisterAgentInput = z.infer<typeof RegisterAgentSchema>;
