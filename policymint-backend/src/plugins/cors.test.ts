import { beforeEach, describe, expect, it, vi } from 'vitest';

const corsPluginMock = vi.hoisted(() => vi.fn());
const envState = vi.hoisted(() => ({ NODE_ENV: 'test' }));

vi.mock('@fastify/cors', () => ({
  default: corsPluginMock,
}));

vi.mock('../config/env.js', () => ({
  env: envState,
}));

describe('registerCors', () => {
  beforeEach(() => {
    vi.resetModules();
    envState.NODE_ENV = 'test';
  });

  it('registers permissive origin outside production', async () => {
    const registerMock = vi.fn().mockResolvedValue(undefined);
    const app = { register: registerMock };
    const { registerCors } = await import('./cors.js');

    await registerCors(app as any);

    expect(registerMock).toHaveBeenCalledWith(corsPluginMock, {
      origin: true,
      credentials: true,
    });
  });

  it('registers strict origin in production', async () => {
    envState.NODE_ENV = 'production';
    const registerMock = vi.fn().mockResolvedValue(undefined);
    const app = { register: registerMock };
    const { registerCors } = await import('./cors.js');

    await registerCors(app as any);

    expect(registerMock).toHaveBeenCalledWith(corsPluginMock, {
      origin: ['https://policymint.vercel.app'],
      credentials: true,
    });
  });
});
