import { describe, expect, it } from 'vitest';
import { parseBigIntSafe } from '../../../../src/modules/policy-engine/evaluators/utils/parse-bigint-safe';

describe('parseBigIntSafe', () => {
  it('returns bigint for a valid integer string', () => {
    expect(parseBigIntSafe('123')).toBe(123n);
  });

  it('returns null for float-like strings', () => {
    expect(parseBigIntSafe('1.23')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseBigIntSafe('')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(parseBigIntSafe(null)).toBeNull();
  });

  it('supports values larger than Number.MAX_SAFE_INTEGER', () => {
    const value = '99999999999999999999';
    expect(parseBigIntSafe(value)).toBe(99999999999999999999n);
  });
});
