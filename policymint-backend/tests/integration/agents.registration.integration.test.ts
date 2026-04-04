import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/db/client';
import { buildApp } from '../../src/app';
import { isValidUUIDv7 } from '../../src/lib/uuid';
import { describeDb } from '../helpers/db';

describeDb('POST /v1/agents', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

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

  it('registers an agent successfully', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/agents',
      payload: {
      name: 'Alpha Agent',
      walletAddress: '0xAbCdEf0123456789aBCdEf0123456789abCDef01',
      strategyType: 'MOMENTUM'
      }
    });
    const body = response.json();

    expect(response.statusCode).toBe(201);
    expect(body.agent.id).toBeTypeOf('string');
    expect(body.agent.name).toBe('Alpha Agent');
    expect(body.agent.walletAddress).toBe('0xabcdef0123456789abcdef0123456789abcdef01');
    expect(body.agent.createdAt).toBeTypeOf('string');
    expect(body.apiKey.startsWith('pm_live_')).toBe(true);
    expect(body._notice).toContain('Store your apiKey securely');
  });

  it('stores API key hash and never plaintext', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/agents',
      payload: {
      name: 'Alpha Agent',
      walletAddress: '0xAbCdEf0123456789aBCdEf0123456789abCDef01'
      }
    });
    const body = response.json();

    const saved = await prisma.agent.findUnique({
      where: { id: body.agent.id },
      select: { apiKeyHash: true }
    });

    expect(saved?.apiKeyHash).toBeDefined();
    expect(saved?.apiKeyHash).not.toBe(body.apiKey);
    expect(saved?.apiKeyHash.startsWith('$2')).toBe(true);
  });

  it('does not return raw or hash API keys on retrieval', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/v1/agents',
      payload: {
      name: 'Alpha Agent',
      walletAddress: '0xAbCdEf0123456789aBCdEf0123456789abCDef01'
      }
    });
    const createdBody = created.json();

    const fetched = await app.inject({
      method: 'GET',
      url: `/v1/agents/${createdBody.agent.id}`,
      headers: {
        authorization: `Bearer ${createdBody.apiKey}`
      }
    });
    const fetchedBody = fetched.json();

    expect(fetched.statusCode).toBe(200);
    expect(fetchedBody.apiKey).toBeUndefined();
    expect(fetchedBody.apiKeyHash).toBeUndefined();
    expect(fetchedBody.apiKeyPrefix).toBeUndefined();
  });

  it('lowercases wallet addresses before storage', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/agents',
      payload: {
      name: 'Mixed Case Wallet',
      walletAddress: '0xAbCdEf0123456789aBCdEf0123456789abCDef01'
      }
    });
    const body = response.json();

    const saved = await prisma.agent.findUnique({
      where: { id: body.agent.id },
      select: { walletAddress: true }
    });

    expect(saved?.walletAddress).toBe('0xabcdef0123456789abcdef0123456789abcdef01');
  });

  it('rejects invalid wallet addresses', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/agents',
      payload: {
      name: 'Bad Wallet',
      walletAddress: '0x123'
      }
    });
    const body = response.json();

    expect(response.statusCode).toBe(422);
    expect(body.error).toBeDefined();
  });

  it('rejects missing required fields', async () => {
    const missingName = await app.inject({
      method: 'POST',
      url: '/v1/agents',
      payload: {
        walletAddress: '0xAbCdEf0123456789aBCdEf0123456789abCDef01'
      }
    });

    const missingWallet = await app.inject({
      method: 'POST',
      url: '/v1/agents',
      payload: {
        name: 'Missing Wallet'
      }
    });

    const emptyBody = await app.inject({
      method: 'POST',
      url: '/v1/agents',
      payload: {}
    });

    expect(missingName.statusCode).toBe(422);
    expect(missingWallet.statusCode).toBe(422);
    expect(emptyBody.statusCode).toBe(422);
  });

  it('persists UUID v7 IDs end-to-end', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/agents',
      payload: {
      name: 'UUID Agent',
      walletAddress: '0xAbCdEf0123456789aBCdEf0123456789abCDef01'
      }
    });
    const body = response.json();

    const saved = await prisma.agent.findUnique({
      where: { id: body.agent.id },
      select: { id: true }
    });

    expect(saved?.id).toBeDefined();
    expect(isValidUUIDv7(saved!.id)).toBe(true);
  });

  it('applies default strategyType and chainId values', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/agents',
      payload: {
      name: 'Defaults Agent',
      walletAddress: '0xAbCdEf0123456789aBCdEf0123456789abCDef01'
      }
    });
    const body = response.json();

    expect(response.statusCode).toBe(201);
    expect(body.agent.strategyType).toBe('MOMENTUM');
    expect(body.agent.chainId).toBe(11155111);
  });

  it('strips unknown fields from the request body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/agents',
      payload: {
      name: 'Field Strip Agent',
      walletAddress: '0xAbCdEf0123456789aBCdEf0123456789abCDef01',
      isAdmin: true
      }
    });
    const body = response.json();

    expect(response.statusCode).toBe(201);
    expect(body.agent.isAdmin).toBeUndefined();
  });
});
