import { ActionType, EvaluationResult, PolicyType, Prisma } from '@prisma/client';
import { prisma } from '../../db/client.js';
import { generateId } from '../../lib/uuid.js';
import { agentAccount } from '../../lib/blockchain/client.js';
import type { EvaluateIntentInput } from './evaluate.schema.js';
import { signEvaluatedIntent } from './eip712.service.js';
import { evaluateDailyLossBudget } from './evaluators/daily-loss-budget.js';
import { evaluateSpendCapPerTx } from './evaluators/spend-cap-per-tx.js';
import { evaluateVenueAllowlist, type EvaluatorResult } from './evaluators/venue-allowlist.js';
import { mapToRiskRouterIntent, type RiskRouterTradeIntent } from './trade-intent.mapper.js';

interface EvaluateIntentResponse {
  result: 'allow' | 'block';
  reason: string | null;
  policy_id: string | null;
  evaluation_id: string;
  eip712_signed_intent: string;
  riskIntentForExecution: RiskRouterTradeIntent | null;
}

const MAX_ALLOWED_TRADES_PER_HOUR = 8;
const MAX_ALLOWED_SLIPPAGE_BPS = 200;

function fallbackRiskIntent(intent: EvaluateIntentInput) {
  return {
    agentId: BigInt(0),
    agentWallet: agentAccount.address,
    pair: `${intent.token_in.toUpperCase()}${(intent.token_out ?? 'USD').toUpperCase()}`,
    action: intent.action_type === 'trade' || intent.action_type === 'swap' ? 'BUY' : 'SELL',
    amountUsdScaled: BigInt(0),
    maxSlippageBps: BigInt(50),
    nonce: BigInt(0),
    deadline: BigInt(Math.floor(Date.now() / 1_000) + 300),
  };
}

export class EvaluationServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
  }
}

function toActionType(actionType: EvaluateIntentInput['action_type']): ActionType {
  return actionType.toUpperCase() as ActionType;
}

function getUtcDayRange(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 0, 0, 0, 0));
  return { start, end };
}

async function getCurrentDailyAllowedTotalWei(agentId: string): Promise<string> {
  const { start, end } = getUtcDayRange();

  const rows = await prisma.$queryRaw<Array<{ total: Prisma.Decimal | string | null }>>`
    SELECT COALESCE(SUM(CASE WHEN amount_raw ~ '^[0-9]+$' THEN amount_raw::numeric ELSE 0 END), 0) AS total
    FROM intent_evaluations
    WHERE agent_id = ${agentId}::uuid
      AND result = 'ALLOW'
      AND created_at >= ${start}
      AND created_at < ${end}
  `;

  const total = rows[0]?.total;
  if (!total) {
    return '0';
  }

  if (typeof total === 'string') {
    return total;
  }

  if (typeof total === 'object' && 'toString' in total) {
    return total.toString();
  }

  return '0';
}

async function getAllowedTradesLastHour(agentId: string): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1_000);

  const count = await prisma.intentEvaluation.count({
    where: {
      agentId,
      result: EvaluationResult.ALLOW,
      actionType: {
        in: [ActionType.TRADE, ActionType.SWAP],
      },
      createdAt: {
        gte: oneHourAgo,
      },
    },
  });

  return count;
}

function evaluatePolicy(input: {
  intent: EvaluateIntentInput;
  policyType: PolicyType;
  policyParams: Prisma.JsonValue;
  currentDailyTotalWei: string;
}): EvaluatorResult {
  // INVARIANT: Invalid or missing policy params always produce a block.
  // Fail-open on a spend cap is a financial vulnerability.
  // If params are malformed, the policy is treated as maximally restrictive.
  if (input.policyType === 'VENUE_ALLOWLIST') {
    return evaluateVenueAllowlist(input.intent, input.policyParams);
  }

  if (input.policyType === 'SPEND_CAP_PER_TX') {
    return evaluateSpendCapPerTx(input.intent, input.policyParams);
  }

  if (input.policyType === 'DAILY_LOSS_BUDGET') {
    return evaluateDailyLossBudget(input.intent, input.policyParams, {
      currentDailyTotalWei: input.currentDailyTotalWei
    });
  }

  return { passed: true };
}

function getRequestedMaxSlippageBps(intent: EvaluateIntentInput): number | null {
  const raw = Number(intent.params?.max_slippage_bps ?? Number.NaN);
  if (!Number.isFinite(raw)) {
    return null;
  }

  return Math.floor(raw);
}

export async function evaluateIntent(intent: EvaluateIntentInput): Promise<EvaluateIntentResponse> {
  const agent = await prisma.agent.findUnique({
    where: { id: intent.agent_id },
    select: {
      id: true,
      erc8004TokenId: true,
      lastNonce: true,
    }
  });

  if (!agent) {
    throw new EvaluationServiceError('Agent not found', 404);
  }

  const activePolicies = await prisma.policy.findMany({
    where: {
      agentId: intent.agent_id,
      isActive: true,
      deletedAt: null
    },
    select: {
      id: true,
      type: true,
      params: true
    },
    orderBy: {
      // TODO(post-hackathon): Replace createdAt ordering with explicit policy priority field.
      createdAt: 'asc'
    }
  });

  let result: 'allow' | 'block' = 'allow';
  let reason: string | null = null;
  let policyId: string | null = null;

  const allowedTradesLastHour = await getAllowedTradesLastHour(intent.agent_id);
  if (allowedTradesLastHour >= MAX_ALLOWED_TRADES_PER_HOUR) {
    result = 'block';
    reason = `Trade rate limit exceeded: max ${MAX_ALLOWED_TRADES_PER_HOUR} allowed trades per rolling hour.`;
  }

  if (result === 'allow' && (intent.action_type === 'trade' || intent.action_type === 'swap')) {
    const requestedMaxSlippageBps = getRequestedMaxSlippageBps(intent);
    if (requestedMaxSlippageBps !== null && requestedMaxSlippageBps > MAX_ALLOWED_SLIPPAGE_BPS) {
      result = 'block';
      reason = `maxSlippageBps exceeds backend ceiling (${MAX_ALLOWED_SLIPPAGE_BPS})`;
    }
  }

  for (const policy of result === 'allow' ? activePolicies : []) {
    const currentDailyTotalWei =
      policy.type === 'DAILY_LOSS_BUDGET' ? await getCurrentDailyAllowedTotalWei(intent.agent_id) : '0';

    const evaluation = evaluatePolicy({
      intent,
      policyType: policy.type,
      policyParams: policy.params,
      currentDailyTotalWei
    });

    if (!evaluation.passed) {
      result = 'block';
      reason = evaluation.reason ?? 'Policy evaluation blocked this intent.';
      policyId = policy.id;
      break;
    }
  }

  let eip712SignedIntent = '';
  let riskIntentForExecution: RiskRouterTradeIntent | null = null;
  const evaluationId = generateId();

  const baseEvaluationData = {
    id: evaluationId,
    agentId: intent.agent_id,
    policyId,
    actionType: toActionType(intent.action_type),
    venue: intent.venue,
    amountRaw: intent.amount,
    tokenIn: intent.token_in,
    tokenOut: intent.token_out ?? null,
    intentParams: intent.params as Prisma.InputJsonValue,
    result: result === 'allow' ? EvaluationResult.ALLOW : EvaluationResult.BLOCK,
    blockReason: reason,
    validationTxHash: null,
  };

  if (result === 'allow' && agent.erc8004TokenId) {
    const currentNonce = typeof agent.lastNonce === 'bigint' ? agent.lastNonce : BigInt(agent.lastNonce);
    const candidateNonce = currentNonce + 1n;

    riskIntentForExecution = await mapToRiskRouterIntent({
      intent,
      erc8004TokenId: agent.erc8004TokenId,
      agentWalletAddress: agentAccount.address,
      nonce: candidateNonce,
      defaultMaxSlippageBps: 50,
    });

    eip712SignedIntent = await signEvaluatedIntent({ intent: riskIntentForExecution });

    await prisma.intentEvaluation.create({
      data: {
        ...baseEvaluationData,
        eip712SignedIntent,
      },
    });
  } else {
    eip712SignedIntent = await signEvaluatedIntent({ intent: fallbackRiskIntent(intent) });

    await prisma.intentEvaluation.create({
      data: {
        ...baseEvaluationData,
        eip712SignedIntent,
      },
    });
  }

  return {
    result,
    reason,
    policy_id: policyId,
    evaluation_id: evaluationId,
    eip712_signed_intent: eip712SignedIntent,
    riskIntentForExecution,
  };
}
