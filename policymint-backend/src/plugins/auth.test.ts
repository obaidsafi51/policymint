import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { apiKeyAuth } from './auth';

const { findFirstMock, verifyApiKeyMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  verifyApiKeyMock: vi.fn(),
}));

vi.mock('../db/client', () => ({
  prisma: {
    agent: {
      findFirst: findFirstMock,
    },
  },
}));

vi.mock('../lib/crypto', () => ({
  verifyApiKey: verifyApiKeyMock,
}));

function createReplyMock() {
  return {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as FastifyReply & {
    status: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
  };
}

function createRequestMock(authorization?: string) {
  return {
    headers: {
      ...(authorization ? { authorization } : {}),
    },
  } as FastifyRequest;
}

describe('apiKeyAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes with a valid API key and attaches agent', async () => {
    const token = 'pm_live_12345678_validsecret';
    const agent = {
      id: 'agent-id',
      name: 'Agent One',
      walletAddress: '0xabc',
      metadataUri: null,
      chainId: 84532,
      strategyType: 'MOMENTUM',
      erc8004TokenId: null,
      apiKeyHash: 'hashed',
      apiKeyPrefix: 'pm_live_12345678',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    findFirstMock.mockResolvedValue(agent);
    verifyApiKeyMock.mockResolvedValue(true);

    const request = createRequestMock(`Bearer ${token}`);
    const reply = createReplyMock();

    await apiKeyAuth(request, reply);

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { apiKeyPrefix: 'pm_live_12345678', isActive: true },
    });
    expect(verifyApiKeyMock).toHaveBeenCalledWith(token, 'hashed');
    expect(reply.status).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
    expect(request.agent).toEqual(agent);
  });

  it('returns 401 for missing Authorization header', async () => {
    const request = createRequestMock();
    const reply = createReplyMock();

    await apiKeyAuth(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(findFirstMock).not.toHaveBeenCalled();
    expect(verifyApiKeyMock).not.toHaveBeenCalled();
  });

  it('returns 401 for malformed Authorization header', async () => {
    const request = createRequestMock('Token pm_live_12345678_secret');
    const reply = createReplyMock();

    await apiKeyAuth(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it('returns 401 for wrong API key', async () => {
    const token = 'pm_live_12345678_wrongsecret';
    const agent = {
      id: 'agent-id',
      name: 'Agent One',
      walletAddress: '0xabc',
      metadataUri: null,
      chainId: 84532,
      strategyType: 'MOMENTUM',
      erc8004TokenId: null,
      apiKeyHash: 'hashed',
      apiKeyPrefix: 'pm_live_12345678',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    findFirstMock.mockResolvedValue(agent);
    verifyApiKeyMock.mockResolvedValue(false);

    const request = createRequestMock(`Bearer ${token}`);
    const reply = createReplyMock();

    await apiKeyAuth(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(verifyApiKeyMock).toHaveBeenCalledWith(token, 'hashed');
    expect(request.agent).toBeUndefined();
  });
});
