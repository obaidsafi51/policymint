import { afterAll, describe, expect, it, vi } from 'vitest';

const REQUIRED_ENV: Record<string, string> = {
  PORT: '3001',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/policymint_test',
  DIRECT_URL: 'postgresql://postgres:postgres@localhost:5432/policymint_test',
  API_KEY_SALT_ROUNDS: '4',
  JWT_SECRET: 'test-jwt-secret-at-least-32-characters-long',
  POLICY_SIGNER_PRIVATE_KEY: '0x1111111111111111111111111111111111111111111111111111111111111111',
  ALCHEMY_RPC_URL: 'https://base-sepolia.g.alchemy.com/v2/test',
  BASE_SEPOLIA_RPC_FALLBACK: 'https://sepolia.base.org',
  CHAIN_ID: '84532'
};

for (const [key, value] of Object.entries(REQUIRED_ENV)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

async function buildAppForEnv(nodeEnv: 'development' | 'production' | 'test') {
  vi.resetModules();
  process.env.NODE_ENV = nodeEnv;
  const { buildApp } = await import('../../src/app');
  return buildApp();
}

describe('global error handler', () => {
  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('returns validation error shape with details', async () => {
    const app = await buildAppForEnv('test');

    app.get('/__test/validation', async () => {
      const validationError = new Error('validation error') as Error & {
        validation: unknown[];
        statusCode: number;
      };
      validationError.validation = [{ message: 'invalid payload' }];
      validationError.statusCode = 422;
      throw validationError;
    });

    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/__test/validation'
    });
    const body = response.json();

    expect(response.statusCode).toBe(422);
    expect(body.error).toBe('Validation Error');
    expect(Array.isArray(body.details)).toBe(true);

    await app.close();
  });

  it('includes stack traces outside production and omits them in production', async () => {
    const devApp = await buildAppForEnv('development');
    devApp.get('/__test/boom-dev', async () => {
      throw new Error('dev boom');
    });

    await devApp.ready();

    const devResponse = await devApp.inject({
      method: 'GET',
      url: '/__test/boom-dev'
    });
    const devBody = devResponse.json();

    expect(devResponse.statusCode).toBe(500);
    expect(devBody.error).toBe('Internal Server Error');
    expect(devBody.stack).toBeTypeOf('string');
    await devApp.close();

    const prodApp = await buildAppForEnv('production');
    prodApp.get('/__test/boom-prod', async () => {
      throw new Error('prod boom');
    });

    await prodApp.ready();

    const prodResponse = await prodApp.inject({
      method: 'GET',
      url: '/__test/boom-prod'
    });
    const prodBody = prodResponse.json();

    expect(prodResponse.statusCode).toBe(500);
    expect(prodBody.error).toBe('Internal Server Error');
    expect(prodBody.stack).toBeUndefined();
    await prodApp.close();
  });

  it('keeps server alive after internal errors', async () => {
    const app = await buildAppForEnv('test');
    const { prisma } = await import('../../src/db/client');

    app.get('/__test/boom', async () => {
      throw new Error('boom');
    });

    await app.ready();

    vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ '?column?': 1 }] as never);

    const first = await app.inject({
      method: 'GET',
      url: '/__test/boom'
    });
    const second = await app.inject({
      method: 'GET',
      url: '/health'
    });
    const secondBody = second.json();

    expect(first.statusCode).toBe(500);
    expect(second.statusCode).toBe(200);
    expect(secondBody.status).toBe('ok');

    await app.close();
  });
});
