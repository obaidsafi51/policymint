import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { prisma } from '../../src/db/client';
import { buildApp } from '../../src/app';
import { generateApiKey } from '../../src/lib/crypto';
import { generateId } from '../../src/lib/uuid';
import { describeDb } from '../helpers/db';

describeDb('POST /v1/evaluate', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let walletCounter = 1;

  function nextWalletAddress() {
    const hex = walletCounter.toString(16).padStart(40, '0');
    walletCounter += 1;
    return `0x${hex}`;
  }

  async function createAgent(name = 'Eval Agent') {
    const id = generateId();
    const apiKey = await generateApiKey();

    await prisma.agent.create({
      data: {
        id,
        name,
        walletAddress: nextWalletAddress(),
        strategyType: 'MOMENTUM',
        chainId: 11155111,
        apiKeyHash: apiKey.hash,
        apiKeyPrefix: apiKey.prefix
      }
    });

    return { id, apiKey: apiKey.raw };
  }

  function basePayload(agentId: string, overrides: Record<string, unknown> = {}) {
    return {
      agent_id: agentId,
      action_type: 'trade',
      venue: 'kraken-spot',
      amount: '1000000000000000000',
      token_in: 'ETH',
      token_out: 'USDC',
      eip712_domain: {
        name: 'PolicyMint',
        version: '1',
        chainId: 11155111,
        verifyingContract: '0x0000000000000000000000000000000000000000'
      },
      params: {},
      ...overrides
    };
  }

  function assertResponseShape(body: Record<string, unknown>, expectedResult: 'allow' | 'block') {
    expect(body.result).toBe(expectedResult);
    expect(['allow', 'block']).toContain(body.result);
    expect(typeof body.evaluation_id).toBe('string');
    expect((body.evaluation_id as string).length).toBeGreaterThan(0);
    expect(typeof body.eip712_signed_intent).toBe('string');
    expect(body.eip712_signed_intent).toMatch(/^0x[a-fA-F0-9]{130}$/);
    expect((body.eip712_signed_intent as string).length).toBe(132);

    if (expectedResult === 'allow') {
      expect(body.reason).toBeNull();
      expect(body.policy_id).toBeNull();
    } else {
      expect(typeof body.reason).toBe('string');
      expect((body.reason as string).length).toBeGreaterThan(0);
      expect(typeof body.policy_id).toBe('string');
      expect((body.policy_id as string).length).toBeGreaterThan(0);
    }
  }

  async function assertPersistedEvaluation(input: {
    evaluationId: string;
    expectedResult: 'ALLOW' | 'BLOCK';
    expectedAmountRaw: string;
  }) {
    const saved = await prisma.intentEvaluation.findUnique({
      where: { id: input.evaluationId }
    });

    expect(saved).toBeTruthy();
    expect(saved?.result).toBe(input.expectedResult);
    expect(saved?.amountRaw).toBe(input.expectedAmountRaw);
    expect(saved?.validationTxHash).toBeNull();
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
    walletCounter = 1;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 when Authorization header is missing', async () => {
    const { id } = await createAgent();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      payload: basePayload(id)
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 401 when api key does not match any agent', async () => {
    const { id } = await createAgent();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: {
        authorization: 'Bearer pm_live_invalidtoken'
      },
      payload: basePayload(id)
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 401 when auth key belongs to different agent than body agent_id', async () => {
    const firstAgent = await createAgent('First');
    const secondAgent = await createAgent('Second');

    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: {
        authorization: `Bearer ${firstAgent.apiKey}`
      },
      payload: basePayload(secondAgent.id)
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 400 when agent_id is missing', async () => {
    const { apiKey } = await createAgent();
    const payload = basePayload(generateId());
    delete (payload as { agent_id?: string }).agent_id;

    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: {
        authorization: `Bearer ${apiKey}`
      },
      payload
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 when action_type is invalid', async () => {
    const { id, apiKey } = await createAgent();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: { authorization: `Bearer ${apiKey}` },
      payload: basePayload(id, { action_type: 'invalid-action' })
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 when amount is missing', async () => {
    const { id, apiKey } = await createAgent();
    const payload = basePayload(id);
    delete (payload as { amount?: string }).amount;

    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: { authorization: `Bearer ${apiKey}` },
      payload
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 when eip712_domain is missing', async () => {
    const { id, apiKey } = await createAgent();
    const payload = basePayload(id);
    delete (payload as { eip712_domain?: unknown }).eip712_domain;

    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: { authorization: `Bearer ${apiKey}` },
      payload
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 when eip712_domain.chainId is a string', async () => {
    const { id, apiKey } = await createAgent();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: { authorization: `Bearer ${apiKey}` },
      payload: basePayload(id, {
        eip712_domain: {
          name: 'PolicyMint',
          version: '1',
          chainId: '11155111',
          verifyingContract: '0x0000000000000000000000000000000000000000'
        }
      })
    });

    expect(response.statusCode).toBe(400);
  });

  it('allows when no active policies exist', async () => {
    const { id, apiKey } = await createAgent();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: { authorization: `Bearer ${apiKey}` },
      payload: basePayload(id)
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    assertResponseShape(body, 'allow');
    expect(response.headers['x-ratelimit-limit']).toBe('10');
    expect(response.headers['x-ratelimit-remaining']).toBeDefined();

    await assertPersistedEvaluation({
      evaluationId: body.evaluation_id,
      expectedResult: 'ALLOW',
      expectedAmountRaw: '1000000000000000000'
    });
  });

  it('allows when venue_allowlist policy matches', async () => {
    const { id, apiKey } = await createAgent();

    await prisma.policy.create({
      data: {
        agentId: id,
        type: 'VENUE_ALLOWLIST',
        params: { allowed_venues: ['kraken-spot'] },
        isActive: true
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: { authorization: `Bearer ${apiKey}` },
      payload: basePayload(id)
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    assertResponseShape(body, 'allow');

    await assertPersistedEvaluation({
      evaluationId: body.evaluation_id,
      expectedResult: 'ALLOW',
      expectedAmountRaw: '1000000000000000000'
    });
  });

  it('allows when all three active policy types are satisfied', async () => {
    const { id, apiKey } = await createAgent();

    await prisma.policy.createMany({
      data: [
        {
          agentId: id,
          type: 'VENUE_ALLOWLIST',
          params: { allowed_venues: ['kraken-spot'] },
          isActive: true
        },
        {
          agentId: id,
          type: 'SPEND_CAP_PER_TX',
          params: { max_amount_wei: '2000000000000000000' },
          isActive: true
        },
        {
          agentId: id,
          type: 'DAILY_LOSS_BUDGET',
          params: { max_daily_loss_wei: '5000000000000000000' },
          isActive: true
        }
      ]
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: { authorization: `Bearer ${apiKey}` },
      payload: basePayload(id)
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    assertResponseShape(body, 'allow');

    await assertPersistedEvaluation({
      evaluationId: body.evaluation_id,
      expectedResult: 'ALLOW',
      expectedAmountRaw: '1000000000000000000'
    });
  });

  it('allows when only matching policy is inactive (inactive ignored)', async () => {
    const { id, apiKey } = await createAgent();

    await prisma.policy.create({
      data: {
        agentId: id,
        type: 'VENUE_ALLOWLIST',
        params: { allowed_venues: ['uniswap-v3'] },
        isActive: false
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: { authorization: `Bearer ${apiKey}` },
      payload: basePayload(id)
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    assertResponseShape(body, 'allow');
  });

  it('blocks for venue_allowlist violation and reason contains venue', async () => {
    const { id, apiKey } = await createAgent();

    const policy = await prisma.policy.create({
      data: {
        agentId: id,
        type: 'VENUE_ALLOWLIST',
        params: { allowed_venues: ['uniswap-v3'] },
        isActive: true
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: { authorization: `Bearer ${apiKey}` },
      payload: basePayload(id)
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    assertResponseShape(body, 'block');
    expect(body.policy_id).toBe(policy.id);
    expect(body.reason).toContain('kraken-spot');

    await assertPersistedEvaluation({
      evaluationId: body.evaluation_id,
      expectedResult: 'BLOCK',
      expectedAmountRaw: '1000000000000000000'
    });
  });

  it('blocks for spend_cap_per_tx violation and reason contains cap value', async () => {
    const { id, apiKey } = await createAgent();

    await prisma.policy.create({
      data: {
        agentId: id,
        type: 'SPEND_CAP_PER_TX',
        params: { max_amount_wei: '999999999999999999' },
        isActive: true
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: { authorization: `Bearer ${apiKey}` },
      payload: basePayload(id)
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    assertResponseShape(body, 'block');
    expect(body.reason).toContain('999999999999999999');
  });

  it('blocks on second call when cumulative daily spend exceeds daily loss budget', async () => {
    const { id, apiKey } = await createAgent();

    await prisma.policy.create({
      data: {
        agentId: id,
        type: 'DAILY_LOSS_BUDGET',
        params: { max_daily_loss_wei: '1500000000000000000' },
        isActive: true
      }
    });

    const payload = basePayload(id);

    const first = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: { authorization: `Bearer ${apiKey}` },
      payload
    });

    const second = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: { authorization: `Bearer ${apiKey}` },
      payload
    });

    const firstBody = first.json();
    const secondBody = second.json();

    expect(first.statusCode).toBe(200);
    assertResponseShape(firstBody, 'allow');
    expect(second.statusCode).toBe(200);
    assertResponseShape(secondBody, 'block');
    expect(secondBody.reason).toContain('Daily loss budget');
  });

  it('uses first blocking policy in createdAt ASC order when multiple policies fail', async () => {
    const { id, apiKey } = await createAgent();

    const firstPolicy = await prisma.policy.create({
      data: {
        agentId: id,
        type: 'VENUE_ALLOWLIST',
        params: { allowed_venues: ['uniswap-v3'] },
        isActive: true
      }
    });

    await prisma.policy.create({
      data: {
        agentId: id,
        type: 'SPEND_CAP_PER_TX',
        params: { max_amount_wei: '1' },
        isActive: true
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: { authorization: `Bearer ${apiKey}` },
      payload: basePayload(id)
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    assertResponseShape(body, 'block');
    expect(body.policy_id).toBe(firstPolicy.id);
  });

  it('excludes yesterday UTC evaluations from daily loss aggregation', async () => {
    const { id, apiKey } = await createAgent();

    await prisma.policy.create({
      data: {
        agentId: id,
        type: 'DAILY_LOSS_BUDGET',
        params: { max_daily_loss_wei: '1500000000000000000' },
        isActive: true
      }
    });

    const now = new Date();
    const yesterday = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - 1,
      23,
      59,
      59,
      0
    ));

    await prisma.intentEvaluation.create({
      data: {
        id: generateId(),
        agentId: id,
        actionType: 'TRADE',
        venue: 'kraken-spot',
        amountRaw: '2000000000000000000',
        tokenIn: 'ETH',
        result: 'ALLOW',
        createdAt: yesterday
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: { authorization: `Bearer ${apiKey}` },
      payload: basePayload(id)
    });

    const body = response.json();
    expect(response.statusCode).toBe(200);
    assertResponseShape(body, 'allow');
  });

  it('excludes blocked evaluations from daily loss aggregation', async () => {
    const { id, apiKey } = await createAgent();

    await prisma.policy.create({
      data: {
        agentId: id,
        type: 'DAILY_LOSS_BUDGET',
        params: { max_daily_loss_wei: '1500000000000000000' },
        isActive: true
      }
    });

    await prisma.intentEvaluation.create({
      data: {
        id: generateId(),
        agentId: id,
        actionType: 'TRADE',
        venue: 'kraken-spot',
        amountRaw: '9000000000000000000',
        tokenIn: 'ETH',
        result: 'BLOCK'
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: { authorization: `Bearer ${apiKey}` },
      payload: basePayload(id)
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    assertResponseShape(body, 'allow');
  });

  it('returns 429 after 10 requests from the same auth key', async () => {
    const { id, apiKey } = await createAgent();
    const payload = basePayload(id);

    const firstTenRequests = Array.from({ length: 10 }, () =>
      app.inject({
        method: 'POST',
        url: '/v1/evaluate',
        headers: {
          authorization: `Bearer ${apiKey}`
        },
        payload
      })
    );

    const firstTenResponses = await Promise.all(firstTenRequests);
    for (const response of firstTenResponses) {
      expect(response.statusCode).toBe(200);
    }

    const eleventhResponse = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: {
        authorization: `Bearer ${apiKey}`
      },
      payload
    });

    expect(eleventhResponse.statusCode).toBe(429);
  });

  it('blocks once 8 allowed trades were recorded in the last rolling hour', async () => {
    const { id, apiKey } = await createAgent();

    const recent = new Date(Date.now() - 10 * 60 * 1_000);
    const historicalAllows = Array.from({ length: 8 }, (_, index) => ({
      id: generateId(),
      agentId: id,
      actionType: 'TRADE' as const,
      venue: 'kraken-spot',
      amountRaw: '1000000000000000000',
      tokenIn: 'ETH',
      tokenOut: 'USDC',
      result: 'ALLOW' as const,
      createdAt: new Date(recent.getTime() + index * 1_000),
    }));

    await prisma.intentEvaluation.createMany({ data: historicalAllows });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: { authorization: `Bearer ${apiKey}` },
      payload: basePayload(id),
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.result).toBe('block');
    expect(body.reason).toContain('max 8 allowed trades per rolling hour');
  });

  it('does not count non-trade allows toward the rolling trade limit', async () => {
    const { id, apiKey } = await createAgent();

    const recent = new Date(Date.now() - 10 * 60 * 1_000);
    const transferAllows = Array.from({ length: 8 }, (_, index) => ({
      id: generateId(),
      agentId: id,
      actionType: 'TRANSFER' as const,
      venue: 'kraken-spot',
      amountRaw: '1000000000000000000',
      tokenIn: 'ETH',
      tokenOut: 'USDC',
      result: 'ALLOW' as const,
      createdAt: new Date(recent.getTime() + index * 1_000),
    }));

    await prisma.intentEvaluation.createMany({ data: transferAllows });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: { authorization: `Bearer ${apiKey}` },
      payload: basePayload(id),
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.result).toBe('allow');
  });

  it('blocks when requested max slippage exceeds backend ceiling', async () => {
    const { id, apiKey } = await createAgent();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: { authorization: `Bearer ${apiKey}` },
      payload: basePayload(id, {
        params: {
          max_slippage_bps: 250,
        },
      }),
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.result).toBe('block');
    expect(body.policy_id).toBeNull();
    expect(body.reason).toContain('maxSlippageBps exceeds backend ceiling');
  });

  it('returns sanitized 500 error when persistence fails and does not expose stack trace', async () => {
    const { id, apiKey } = await createAgent();
    vi.spyOn(prisma.intentEvaluation, 'create').mockRejectedValue(new Error('db write failure'));

    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: { authorization: `Bearer ${apiKey}` },
      payload: basePayload(id)
    });

    const body = response.json();

    expect(response.statusCode).toBe(500);
    expect(body).toEqual({ error: 'Internal evaluation error', evaluation_id: null });
    expect(body.stack).toBeUndefined();
  });
});
