import { z } from 'zod';

const MAX_SPEND_CAP_USD = 450;
const MAX_DAILY_LOSS_PERCENT = 4;

const VenueAllowlistPolicySchema = z.object({
  agentId: z.string().uuid(),
  type: z.literal('VENUE_ALLOWLIST'),
  params: z.object({
    allowed_venues: z.array(z.string().min(1)).min(1),
  }).passthrough(),
  isActive: z.boolean().default(true),
});

const SpendCapPolicySchema = z.object({
  agentId: z.string().uuid(),
  type: z.literal('SPEND_CAP_PER_TX'),
  params: z.object({
    max_amount_wei: z.string().regex(/^[0-9]+$/),
    max_amount_usd: z.number().positive().max(MAX_SPEND_CAP_USD).default(MAX_SPEND_CAP_USD),
  }).passthrough().refine(
    params => params.max_amount_usd <= MAX_SPEND_CAP_USD,
    {
      message: 'spend_cap_per_tx cannot exceed $450 — RiskRouter hard limit is $500',
      path: ['max_amount_usd'],
    },
  ),
  isActive: z.boolean().default(true),
});

const DailyLossPolicySchema = z.object({
  agentId: z.string().uuid(),
  type: z.literal('DAILY_LOSS_BUDGET'),
  params: z.object({
    max_daily_loss_wei: z.string().regex(/^[0-9]+$/),
    max_daily_loss_percent: z.number().positive().max(MAX_DAILY_LOSS_PERCENT).default(MAX_DAILY_LOSS_PERCENT),
  }).passthrough().refine(
    params => params.max_daily_loss_percent <= MAX_DAILY_LOSS_PERCENT,
    {
      message: 'daily_loss_budget cannot exceed 4% — RiskRouter hard limit is 5%',
      path: ['max_daily_loss_percent'],
    },
  ),
  isActive: z.boolean().default(true),
});

export const CreatePolicySchema = z.discriminatedUnion('type', [
  VenueAllowlistPolicySchema,
  SpendCapPolicySchema,
  DailyLossPolicySchema,
]);

export type CreatePolicyInput = z.infer<typeof CreatePolicySchema>;
