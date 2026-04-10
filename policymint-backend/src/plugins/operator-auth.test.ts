import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { operatorJwtAuth } from './operator-auth.js';

const { verifyOperatorJwtMock } = vi.hoisted(() => ({
  verifyOperatorJwtMock: vi.fn(),
}));

vi.mock('../lib/operator-jwt', () => ({
  verifyOperatorJwt: verifyOperatorJwtMock,
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

function createRequestMock(token?: string) {
  return {
    headers: token ? { 'x-operator-token': token } : {},
  } as unknown as FastifyRequest;
}

describe('operatorJwtAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('attaches operator context for valid tokens', async () => {
    verifyOperatorJwtMock.mockReturnValue({
      ok: true,
      payload: {
        operator_wallet: '0xabc',
        agent_ids: ['agent-1'],
        exp: 2000000000,
      },
    });

    const request = createRequestMock('token');
    const reply = createReplyMock();

    await operatorJwtAuth(request, reply);

    expect(request.operatorContext).toEqual({
      operatorWallet: '0xabc',
      agentIds: ['agent-1'],
      expiresAt: 2000000000,
    });
    expect(reply.status).not.toHaveBeenCalled();
  });

  it('returns TOKEN_MISSING when header is absent', async () => {
    const request = createRequestMock();
    const reply = createReplyMock();

    await operatorJwtAuth(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'TOKEN_MISSING',
        message: 'Missing operator token',
      },
    });
  });

  it('returns TOKEN_EXPIRED for expired tokens', async () => {
    verifyOperatorJwtMock.mockReturnValue({ ok: false, code: 'TOKEN_EXPIRED' });

    const request = createRequestMock('token');
    const reply = createReplyMock();

    await operatorJwtAuth(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Operator token has expired',
      },
    });
  });
});
