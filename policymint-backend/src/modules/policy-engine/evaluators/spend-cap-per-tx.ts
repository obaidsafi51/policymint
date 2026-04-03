import type { JsonValue } from '@prisma/client/runtime/library';
import type { EvaluateIntentInput } from '../evaluate.schema';
import type { EvaluatorResult } from './venue-allowlist';

interface SpendCapPerTxParams {
  max_amount_wei?: string;
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

export function evaluateSpendCapPerTx(
  intent: EvaluateIntentInput,
  params: JsonValue
): EvaluatorResult {
  const typedParams = (params ?? {}) as SpendCapPerTxParams;

  const parsedIntentAmount = parseBigIntSafe(intent.amount);
  if (parsedIntentAmount === null) {
    return {
      passed: false,
      reason: 'Intent amount is not a valid numeric string.'
    };
  }

  const parsedMaxAmount = parseBigIntSafe(typedParams.max_amount_wei ?? '');
  if (parsedMaxAmount === null) {
    return {
      passed: false,
      reason: 'Transaction amount exceeds per-transaction cap of invalid wei.'
    };
  }

  if (parsedIntentAmount > parsedMaxAmount) {
    return {
      passed: false,
      reason: `Transaction amount exceeds per-transaction cap of ${typedParams.max_amount_wei} wei.`
    };
  }

  return { passed: true };
}
