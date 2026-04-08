import { describe, expect, it, vi } from 'vitest';

const sensiblePluginMock = vi.hoisted(() => vi.fn());

vi.mock('@fastify/sensible', () => ({
  default: sensiblePluginMock,
}));

describe('registerSensible', () => {
  it('registers fastify sensible plugin', async () => {
    const registerMock = vi.fn().mockResolvedValue(undefined);
    const app = { register: registerMock };
    const { registerSensible } = await import('./sensible.js');

    await registerSensible(app as any);

    expect(registerMock).toHaveBeenCalledWith(sensiblePluginMock);
  });
});
