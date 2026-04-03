import type { JsonValue } from '@prisma/client/runtime/library';
import type { EvaluateIntentInput } from '../evaluate.schema';
import type { EvaluatorResult } from './venue-allowlist';
import { parseBigIntSafe } from './utils/parse-bigint-safe';

interface DailyLossBudgetParams {
  max_daily_loss_wei?: string;
}

interface DailyLossBudgetContext {
  currentDailyTotalWei: string;
}

export function evaluateDailyLossBudget(
  intent: EvaluateIntentInput,
  params: JsonValue,
  context: DailyLossBudgetContext
): EvaluatorResult {
  const typedParams = params as DailyLossBudgetParams | null;

  if (!typedParams?.max_daily_loss_wei || typeof typedParams.max_daily_loss_wei !== 'string') {
    return {
      passed: false,
      reason: 'Policy misconfiguration: daily_loss_budget is missing required param max_daily_loss_wei.'
    };
  }

  const parsedMaxDailyLoss = parseBigIntSafe(typedParams.max_daily_loss_wei);
  if (parsedMaxDailyLoss === null) {
    return {
      passed: false,
      reason: `Policy misconfiguration: max_daily_loss_wei "${typedParams.max_daily_loss_wei}" is not a valid numeric string.`
    };
  }

  const parsedIntentAmount = parseBigIntSafe(intent.amount);
  if (parsedIntentAmount === null) {
    return {
      passed: false,
      reason: `Intent amount "${intent.amount}" is not a valid numeric string.`
    };
  }

  const parsedCurrentDailyTotal = parseBigIntSafe(context.currentDailyTotalWei);
  if (parsedCurrentDailyTotal === null) {
    return {
      passed: false,
      reason: 'Current daily spend total is not a valid numeric string.'
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
