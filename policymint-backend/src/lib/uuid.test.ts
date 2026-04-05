import { describe, expect, it } from 'vitest';
import { generateId, isValidUUIDv7 } from './uuid.js';

describe('uuid utility', () => {
  it('generates valid UUID v7 IDs', () => {
    for (let index = 0; index < 10; index += 1) {
      const id = generateId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(isValidUUIDv7(id)).toBe(true);
    }
  });

  it('is monotonic when sorted lexicographically', () => {
    const ids = Array.from({ length: 100 }, () => generateId());
    const sorted = [...ids].sort();
    expect(sorted).toEqual(ids);
  });

  it('is unique across large generation batches', () => {
    const ids = Array.from({ length: 1000 }, () => generateId());
    const unique = new Set(ids);
    expect(unique.size).toBe(1000);
  });

  it('rejects non-v7 values', () => {
    const invalidCases = [
      '',
      '550e8400-e29b-41d4-a716-446655440000',
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      'undefined',
      String(null),
      'abc123',
    ];

    for (const invalid of invalidCases) {
      expect(isValidUUIDv7(invalid)).toBe(false);
    }
  });
});
