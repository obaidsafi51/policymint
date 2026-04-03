import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import dotenv from 'dotenv';

async function disconnectPrisma(): Promise<void> {
  const { prisma } = await import('../src/db/client');
  await prisma.$disconnect();
}

export default async function setup() {
  const envTestPath = resolve(process.cwd(), '.env.test');
  if (existsSync(envTestPath)) {
    dotenv.config({ path: envTestPath, override: true });
  }

  if (process.env.RUN_DB_TESTS === 'true') {
    execSync('npx prisma migrate reset --force --skip-seed', {
      stdio: 'inherit',
      env: process.env
    });
  }

  return async () => {
    if (process.env.RUN_DB_TESTS === 'true') {
      await disconnectPrisma();
    }
  };
}
