import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createPolicyMock = vi.hoisted(() => vi.fn());
const listPoliciesByAgentMock = vi.hoisted(() => vi.fn());

vi.mock('./policy.service.js', () => ({
  createPolicy: createPolicyMock,
  listPoliciesByAgent: listPoliciesByAgentMock,
}));

describe('policyRoutes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  it('returns 422 for invalid policy payload', async () => {
    const app = Fastify();
    const { policyRoutes } = await import('./policy.routes.js');
    await app.register(policyRoutes, { prefix: '/policies' });

    const response = await app.inject({
      method: 'POST',
      url: '/policies',
      payload: { invalid: true },
    });

    expect(response.statusCode).toBe(422);
    const body = response.json();
    expect(body.message).toContain('Policy validation failed');
    expect(createPolicyMock).not.toHaveBeenCalled();

    await app.close();
  });

  it('creates policy and returns 201 for valid payload', async () => {
    const createdPolicy = {
      id: 'policy-1',
      agentId: 'a1111111-1111-4111-8111-111111111111',
      type: 'VENUE_ALLOWLIST',
      params: { allowed_venues: ['kraken'] },
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    createPolicyMock.mockResolvedValue(createdPolicy);
    const app = Fastify();
    const { policyRoutes } = await import('./policy.routes.js');
    await app.register(policyRoutes, { prefix: '/policies' });

    const response = await app.inject({
      method: 'POST',
      url: '/policies',
      payload: {
        agentId: 'a1111111-1111-4111-8111-111111111111',
        type: 'VENUE_ALLOWLIST',
        params: { allowed_venues: ['kraken'] },
        isActive: true,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(createPolicyMock).toHaveBeenCalledTimes(1);
    expect(response.json()).toEqual(createdPolicy);

    await app.close();
  });

  it('returns 422 for invalid agentId in GET route', async () => {
    const app = Fastify();
    const { policyRoutes } = await import('./policy.routes.js');
    await app.register(policyRoutes, { prefix: '/policies' });

    const response = await app.inject({
      method: 'GET',
      url: '/policies/agent/not-a-uuid',
    });

    expect(response.statusCode).toBe(422);
    expect(listPoliciesByAgentMock).not.toHaveBeenCalled();

    await app.close();
  });

  it('returns list for valid agentId in GET route', async () => {
    const policies = [
      {
        id: 'policy-2',
        type: 'SPEND_CAP_PER_TX',
        params: { max_amount_wei: '1', max_amount_usd: 1 },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    listPoliciesByAgentMock.mockResolvedValue(policies);
    const app = Fastify();
    const { policyRoutes } = await import('./policy.routes.js');
    await app.register(policyRoutes, { prefix: '/policies' });

    const response = await app.inject({
      method: 'GET',
      url: '/policies/agent/a1111111-1111-4111-8111-111111111111',
    });

    expect(response.statusCode).toBe(200);
    expect(listPoliciesByAgentMock).toHaveBeenCalledWith('a1111111-1111-4111-8111-111111111111');
    expect(response.json()).toEqual({ items: policies });

    await app.close();
  });
});
