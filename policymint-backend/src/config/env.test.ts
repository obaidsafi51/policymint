import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = process.env;

const validEnv = {
  NODE_ENV: 'test',
  PORT: '3000',
  DATABASE_URL: 'https://example.com',
  DIRECT_URL: 'https://example.com',
  API_KEY_SALT_ROUNDS: '12',
  JWT_SECRET: 'this-is-a-long-secret-with-32-characters-min',
  ALCHEMY_RPC_URL: 'https://example.com',
  BASE_SEPOLIA_RPC_FALLBACK: 'https://sepolia.base.org',
  CHAIN_ID: '84532'
};

async function importEnvModule() {
  return import('./env');
}

describe('env config', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...validEnv };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  it('parses valid environment values', async () => {
    const { env } = await importEnvModule();

    expect(env.NODE_ENV).toBe('test');
    expect(typeof env.PORT).toBe('number');
    expect(env.PORT).toBe(3000);
    expect(typeof env.CHAIN_ID).toBe('number');
    expect(env.ALCHEMY_RPC_URL.startsWith('http')).toBe(true);
  });

  it('exits when a required variable is missing', async () => {
    delete process.env.DATABASE_URL;
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: string | number | null) => {
      throw new Error(`process.exit:${code}`);
    }) as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(importEnvModule()).rejects.toThrow('process.exit:1');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits when a URL field is malformed', async () => {
    process.env.DATABASE_URL = 'not-a-url';
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: string | number | null) => {
      throw new Error(`process.exit:${code}`);
    }) as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(importEnvModule()).rejects.toThrow('process.exit:1');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('applies default values', async () => {
    delete process.env.PORT;
    delete process.env.CHAIN_ID;
    delete process.env.BASE_SEPOLIA_RPC_FALLBACK;

    const { env } = await importEnvModule();
    expect(env.PORT).toBe(3000);
    expect(env.CHAIN_ID).toBe(84532);
    expect(env.BASE_SEPOLIA_RPC_FALLBACK).toBe('https://sepolia.base.org');
  });

  it('rejects unsupported NODE_ENV values', async () => {
    process.env.NODE_ENV = 'staging';
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: string | number | null) => {
      throw new Error(`process.exit:${code}`);
    }) as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(importEnvModule()).rejects.toThrow('process.exit:1');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
