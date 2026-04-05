import type { JsonValue } from '@prisma/client/runtime/library';
import type { EvaluateIntentInput } from '../evaluate.schema.js';
import type { EvaluatorResult } from './venue-allowlist.js';
import { parseBigIntSafe } from './utils/parse-bigint-safe.js';

interface SpendCapPerTxParams {
  max_amount_wei?: string;
}

export function evaluateSpendCapPerTx(
  intent: EvaluateIntentInput,
  params: JsonValue
): EvaluatorResult {
  const typedParams = params as SpendCapPerTxParams | null;

  if (!typedParams?.max_amount_wei || typeof typedParams.max_amount_wei !== 'string') {
    return {
      passed: false,
      reason: 'Policy misconfiguration: spend_cap_per_tx is missing required param max_amount_wei.'
    };
  }

  const parsedMaxAmount = parseBigIntSafe(typedParams.max_amount_wei);
  if (parsedMaxAmount === null) {
    return {
      passed: false,
      reason: `Policy misconfiguration: max_amount_wei "${typedParams.max_amount_wei}" is not a valid numeric string.`
    };
  }

  const parsedIntentAmount = parseBigIntSafe(intent.amount);
  if (parsedIntentAmount === null) {
    return {
      passed: false,
      reason: `Intent amount "${intent.amount}" is not a valid numeric string.`
    };
  }

  if (parsedIntentAmount > parsedMaxAmount) {
    return {
      passed: false,
      reason: `Transaction amount ${intent.amount} wei exceeds per-transaction cap of ${typedParams.max_amount_wei} wei.`
    };
  }

  return { passed: true };
}
