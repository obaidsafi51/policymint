import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/db/client';
import { generateApiKey } from '../../src/lib/crypto';
import { generateId } from '../../src/lib/uuid';
import { describeDb } from '../helpers/db';

describeDb('GET /v1/agents/:id', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  async function createAuthenticatedAgent() {
    const authId = generateId();
    const authKey = await generateApiKey();

    await prisma.agent.create({
      data: {
        id: authId,
        name: 'Auth Agent',
        walletAddress: '0xabcdef0123456789abcdef0123456789abcdef01',
        strategyType: 'MOMENTUM',
        chainId: 11155111,
        apiKeyHash: authKey.hash,
        apiKeyPrefix: authKey.prefix
      }
    });

    return { authorization: `Bearer ${authKey.raw}` };
  }

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    await prisma.validationRecord.deleteMany();
    await prisma.intentEvaluation.deleteMany();
    await prisma.policy.deleteMany();
    await prisma.reputationSignal.deleteMany();
    await prisma.strategyCycle.deleteMany();
    await prisma.agent.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 when Authorization header is missing', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/agents/${generateId()}`
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns seeded agent when found', async () => {
    const authHeaders = await createAuthenticatedAgent();
    const id = generateId();
    const apiKey = await generateApiKey();

    await prisma.agent.create({
      data: {
        id,
        name: 'Seeded Agent',
        walletAddress: '0xabcdef0123456789abcdef0123456789abcdef01',
        strategyType: 'MOMENTUM',
        chainId: 11155111,
        apiKeyHash: apiKey.hash,
        apiKeyPrefix: apiKey.prefix
      }
    });

    const response = await app.inject({
      method: 'GET',
      url: `/v1/agents/${id}`,
      headers: authHeaders
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.id).toBe(id);
    expect(body.name).toBe('Seeded Agent');
    expect(body.walletAddress).toBe('0xabcdef0123456789abcdef0123456789abcdef01');
    expect(body.strategyType).toBe('MOMENTUM');
    expect(body.chainId).toBe(11155111);
    expect(body.isActive).toBe(true);
    expect(body.createdAt).toBeTypeOf('string');
    expect(body._count).toEqual({ policies: 0, evaluations: 0 });
  });

  it('returns 404 for unknown valid UUID', async () => {
    const authHeaders = await createAuthenticatedAgent();
    const response = await app.inject({
      method: 'GET',
      url: `/v1/agents/${generateId()}`,
      headers: authHeaders
    });
    expect(response.statusCode).toBe(404);
  });

  it('returns 422 for invalid ID formats', async () => {
    const authHeaders = await createAuthenticatedAgent();
    const response = await app.inject({
      method: 'GET',
      url: '/v1/agents/not-a-uuid',
      headers: authHeaders
    });
    expect(response.statusCode).toBe(422);
  });

  it('never exposes sensitive API key fields', async () => {
    const authHeaders = await createAuthenticatedAgent();
    const id = generateId();
    const apiKey = await generateApiKey();

    await prisma.agent.create({
      data: {
        id,
        name: 'Sensitive Test Agent',
        walletAddress: '0xabcdef0123456789abcdef0123456789abcdef01',
        strategyType: 'MOMENTUM',
        chainId: 11155111,
        apiKeyHash: apiKey.hash,
        apiKeyPrefix: apiKey.prefix
      }
    });

    const response = await app.inject({
      method: 'GET',
      url: `/v1/agents/${id}`,
      headers: authHeaders
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.apiKey).toBeUndefined();
    expect(body.apiKeyHash).toBeUndefined();
    expect(body.apiKeyPrefix).toBeUndefined();
  });
});
