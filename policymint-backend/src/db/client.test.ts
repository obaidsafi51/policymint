import { describe, expect, it } from 'vitest';
import { prisma } from './client';

const describeDb = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeDb('prisma client', () => {
  it('connects successfully', async () => {
    await expect(prisma.$queryRaw`SELECT 1`).resolves.toBeDefined();
  });

  it('returns a singleton instance across imports', async () => {
    const moduleAgain = await import('./client');
    expect(moduleAgain.prisma).toBe(prisma);
  });
});
