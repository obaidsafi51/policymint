import { beforeAll, describe, vi } from 'vitest';

export const isDbTestsEnabled = process.env.RUN_DB_TESTS === 'true';
export const describeDb = isDbTestsEnabled ? describe : describe.skip;

export function requireDbOrSkip(): void {
  beforeAll(() => {
    if (!isDbTestsEnabled) {
      vi.resetAllMocks();
    }
  });
}
