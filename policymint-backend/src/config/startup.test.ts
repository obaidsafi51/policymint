import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const envMock = {
  IDENTITY_REGISTRY_ADDRESS: '0x97b07dDc405B0c28B17559aFFE63BdB3632d0ca3',
  AGENT_REGISTRY_ADDRESS: undefined,
  RISK_ROUTER_ADDRESS: '0xd6A6952545FF6E6E6681c2d15C59f9EB8F40FdBC',
  HACKATHON_VAULT_ADDRESS: '0x0E7CD8ef9743FEcf94f9103033a044caBD45fC90',
  VALIDATION_REGISTRY_ADDRESS: '0x92bF63E5C7Ac6980f237a7164Ab413BE226187F1',
  REPUTATION_REGISTRY_ADDRESS: '0x423a9904e39537a9997fbaF0f220d79D7d545763',
  PRISM_API_KEY: 'prism_sk_test',
  PRISM_BASE_URL: 'https://api.prismapi.ai',
  STRATEGY_TICK_INTERVAL_MS: 450000,
};

describe('validateStartupConfiguration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes when env and wallets are valid', async () => {
    vi.doMock('./env.js', () => ({ env: envMock }));
    vi.doMock('../lib/blockchain/client.js', () => ({
      operatorAccount: { address: '0x1111111111111111111111111111111111111111' },
      agentAccount: { address: '0x2222222222222222222222222222222222222222' },
    }));
    vi.doMock('../lib/logger.js', () => ({ logger: { info: vi.fn() } }));

    const { validateStartupConfiguration } = await import('./startup.js');

    expect(() => validateStartupConfiguration()).not.toThrow();
  });

  it('throws when wallets are equal', async () => {
    vi.doMock('./env.js', () => ({ env: envMock }));
    vi.doMock('../lib/blockchain/client.js', () => ({
      operatorAccount: { address: '0x1111111111111111111111111111111111111111' },
      agentAccount: { address: '0x1111111111111111111111111111111111111111' },
    }));
    vi.doMock('../lib/logger.js', () => ({ logger: { info: vi.fn() } }));

    const { validateStartupConfiguration } = await import('./startup.js');

    expect(() => validateStartupConfiguration()).toThrow(/must be different/);
  });

  it('throws when required contract address is missing', async () => {
    vi.doMock('./env.js', () => ({
      env: {
        ...envMock,
        RISK_ROUTER_ADDRESS: undefined,
      },
    }));
    vi.doMock('../lib/blockchain/client.js', () => ({
      operatorAccount: { address: '0x1111111111111111111111111111111111111111' },
      agentAccount: { address: '0x2222222222222222222222222222222222222222' },
    }));
    vi.doMock('../lib/logger.js', () => ({ logger: { info: vi.fn() } }));

    const { validateStartupConfiguration } = await import('./startup.js');

    expect(() => validateStartupConfiguration()).toThrow(/Missing required contract addresses/);
  });

  it('throws when PRISM_API_KEY is missing', async () => {
    vi.doMock('./env.js', () => ({
      env: {
        ...envMock,
        PRISM_API_KEY: undefined,
      },
    }));
    vi.doMock('../lib/blockchain/client.js', () => ({
      operatorAccount: { address: '0x1111111111111111111111111111111111111111' },
      agentAccount: { address: '0x2222222222222222222222222222222222222222' },
    }));
    vi.doMock('../lib/logger.js', () => ({ logger: { info: vi.fn() } }));

    const { validateStartupConfiguration } = await import('./startup.js');

    expect(() => validateStartupConfiguration()).toThrow(/PRISM_API_KEY/);
  });

  it('throws when PRISM_BASE_URL is missing', async () => {
    vi.doMock('./env.js', () => ({
      env: {
        ...envMock,
        PRISM_BASE_URL: undefined,
      },
    }));
    vi.doMock('../lib/blockchain/client.js', () => ({
      operatorAccount: { address: '0x1111111111111111111111111111111111111111' },
      agentAccount: { address: '0x2222222222222222222222222222222222222222' },
    }));
    vi.doMock('../lib/logger.js', () => ({ logger: { info: vi.fn() } }));

    const { validateStartupConfiguration } = await import('./startup.js');

    expect(() => validateStartupConfiguration()).toThrow(/PRISM_BASE_URL/);
  });

  it('throws when both IDENTITY_REGISTRY_ADDRESS and AGENT_REGISTRY_ADDRESS are missing', async () => {
    vi.doMock('./env.js', () => ({
      env: {
        ...envMock,
        IDENTITY_REGISTRY_ADDRESS: undefined,
        AGENT_REGISTRY_ADDRESS: undefined,
      },
    }));
    vi.doMock('../lib/blockchain/client.js', () => ({
      operatorAccount: { address: '0x1111111111111111111111111111111111111111' },
      agentAccount: { address: '0x2222222222222222222222222222222222222222' },
    }));
    vi.doMock('../lib/logger.js', () => ({ logger: { info: vi.fn() } }));

    const { validateStartupConfiguration } = await import('./startup.js');

    expect(() => validateStartupConfiguration()).toThrow(/IDENTITY_REGISTRY_ADDRESS or AGENT_REGISTRY_ADDRESS/);
  });

  it('accepts AGENT_REGISTRY_ADDRESS when IDENTITY_REGISTRY_ADDRESS is missing', async () => {
    vi.doMock('./env.js', () => ({
      env: {
        ...envMock,
        IDENTITY_REGISTRY_ADDRESS: undefined,
        AGENT_REGISTRY_ADDRESS: '0x1234567890123456789012345678901234567890',
      },
    }));
    vi.doMock('../lib/blockchain/client.js', () => ({
      operatorAccount: { address: '0x1111111111111111111111111111111111111111' },
      agentAccount: { address: '0x2222222222222222222222222222222222222222' },
    }));
    vi.doMock('../lib/logger.js', () => ({ logger: { info: vi.fn() } }));

    const { validateStartupConfiguration } = await import('./startup.js');

    expect(() => validateStartupConfiguration()).not.toThrow();
  });
});
