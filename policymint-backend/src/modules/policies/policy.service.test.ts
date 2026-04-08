import { beforeEach, describe, expect, it, vi } from 'vitest';

const createMock = vi.hoisted(() => vi.fn());
const findManyMock = vi.hoisted(() => vi.fn());

vi.mock('../../db/client.js', () => ({
  prisma: {
    policy: {
      create: createMock,
      findMany: findManyMock,
    },
  },
}));

describe('policy.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates policy with mapped prisma payload and select', async () => {
    const created = {
      id: 'policy-1',
      agentId: 'agent-1',
      type: 'SPEND_CAP_PER_TX',
      params: { maxUsd: 100 },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    createMock.mockResolvedValue(created);
    const { createPolicy } = await import('./policy.service.js');

    const input = {
      agentId: 'agent-1',
      type: 'SPEND_CAP_PER_TX',
      params: { maxUsd: 100 },
      isActive: true,
    } as const;

    const result = await createPolicy(input as any);

    expect(createMock).toHaveBeenCalledWith({
      data: {
        agentId: 'agent-1',
        type: 'SPEND_CAP_PER_TX',
        params: { maxUsd: 100 },
        isActive: true,
      },
      select: {
        id: true,
        agentId: true,
        type: true,
        params: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(result).toEqual(created);
  });

  it('lists active policies for an agent ordered by latest first', async () => {
    const items = [
      {
        id: 'policy-2',
        type: 'DAILY_LOSS_BUDGET',
        params: { maxDailyLossBps: 100 },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    findManyMock.mockResolvedValue(items);
    const { listPoliciesByAgent } = await import('./policy.service.js');

    const result = await listPoliciesByAgent('agent-1');

    expect(findManyMock).toHaveBeenCalledWith({
      where: { agentId: 'agent-1', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        params: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(result).toEqual(items);
  });
});
