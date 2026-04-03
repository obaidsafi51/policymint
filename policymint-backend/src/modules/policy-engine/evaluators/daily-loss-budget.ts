import type { JsonValue } from '@prisma/client/runtime/library';
import type { EvaluateIntentInput } from '../evaluate.schema';
import type { EvaluatorResult } from './venue-allowlist';

interface DailyLossBudgetParams {
  max_daily_loss_wei?: string;
}

interface DailyLossBudgetContext {
  currentDailyTotalWei: string;
}

function parseBigIntSafe(value: string): bigint | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

export function evaluateDailyLossBudget(
  intent: EvaluateIntentInput,
  params: JsonValue,
  context: DailyLossBudgetContext
): EvaluatorResult {
  const typedParams = (params ?? {}) as DailyLossBudgetParams;

  const parsedIntentAmount = parseBigIntSafe(intent.amount);
  if (parsedIntentAmount === null) {
    return {
      passed: false,
      reason: 'Intent amount is not a valid numeric string.'
    };
  }

  const parsedCurrentDailyTotal = parseBigIntSafe(context.currentDailyTotalWei);
  if (parsedCurrentDailyTotal === null) {
    return {
      passed: false,
      reason: 'Current daily spend total is not a valid numeric string.'
    };
  }

  const parsedMaxDailyLoss = parseBigIntSafe(typedParams.max_daily_loss_wei ?? '');
  if (parsedMaxDailyLoss === null) {
    return {
      passed: false,
      reason: 'Daily loss policy max amount is not a valid numeric string.'
    };
  }

  const projectedTotal = parsedCurrentDailyTotal + parsedIntentAmount;

  if (projectedTotal > parsedMaxDailyLoss) {
    return {
      passed: false,
      reason: `Daily loss budget of ${typedParams.max_daily_loss_wei} wei would be exceeded. Current daily spend: ${context.currentDailyTotalWei} wei.`
    };
  }

  return { passed: true };
}
