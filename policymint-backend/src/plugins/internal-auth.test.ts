import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';

const envState = vi.hoisted(() => ({ INTERNAL_SERVICE_KEY: 'internal-secret' as string | undefined }));

vi.mock('../config/env.js', () => ({
  env: envState,
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

function createRequestMock(headers: Record<string, unknown> = {}) {
  return {
    headers,
    log: {
      error: vi.fn(),
    },
  } as unknown as FastifyRequest & {
    log: { error: ReturnType<typeof vi.fn> };
  };
}

describe('internalAuthHook', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    envState.INTERNAL_SERVICE_KEY = 'internal-secret';
  });

  it('returns 503 when INTERNAL_SERVICE_KEY is not configured', async () => {
    envState.INTERNAL_SERVICE_KEY = undefined;
    const request = createRequestMock();
    const reply = createReplyMock();
    const { internalAuthHook } = await import('./internal-auth.js');

    await internalAuthHook(request, reply);

    expect(request.log.error).toHaveBeenCalledWith('INTERNAL_SERVICE_KEY is not configured');
    expect(reply.status).toHaveBeenCalledWith(503);
    expect(reply.send).toHaveBeenCalledWith({
      error: 'INTERNAL_AUTH_NOT_CONFIGURED',
      message: 'Internal authentication is not configured on this service',
    });
  });

  it('returns 401 when x-internal-key is missing or invalid', async () => {
    const request = createRequestMock();
    const reply = createReplyMock();
    const { internalAuthHook } = await import('./internal-auth.js');

    await internalAuthHook(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({
      error: 'UNAUTHORIZED',
      message: 'Missing or invalid internal service key',
    });
  });

  it('allows request when x-internal-key matches configured key', async () => {
    const request = createRequestMock({ 'x-internal-key': 'internal-secret' });
    const reply = createReplyMock();
    const { internalAuthHook } = await import('./internal-auth.js');

    await internalAuthHook(request, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
  });
});
