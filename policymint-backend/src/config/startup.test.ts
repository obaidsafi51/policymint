import { afterEach, describe, expect, it, vi } from 'vitest';

const BASE_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  PORT: '3001',
  DATABASE_URL: 'https://example.com',
  DIRECT_URL: 'https://example.com',
  API_KEY_SALT_ROUNDS: '4',
  JWT_SECRET: 'test-jwt-secret-at-least-32-characters-long',
  OPERATOR_WALLET_PRIVATE_KEY: '0x1111111111111111111111111111111111111111111111111111111111111111',
  AGENT_WALLET_PRIVATE_KEY: '0x2222222222222222222222222222222222222222222222222222222222222222',
  POLICY_SIGNER_PRIVATE_KEY: '0x1111111111111111111111111111111111111111111111111111111111111111',
  ALCHEMY_RPC_URL: 'https://example.com',
  SEPOLIA_RPC_FALLBACK: 'https://ethereum-sepolia-rpc.publicnode.com/',
  CHAIN_ID: '11155111',
  RISK_ROUTER_ADDRESS: '0xd6A6952545FF6E6E6681c2d15C59f9EB8F40FdBC',
  HACKATHON_VAULT_ADDRESS: '0x0E7CD8ef9743FEcf94f9103033a044caBD45fC90',
  IDENTITY_REGISTRY_ADDRESS: '0x97b07dDc405B0c28B17559aFFE63BdB3632d0ca3',
  VALIDATION_REGISTRY_ADDRESS: '0x92bF63E5C7Ac6980f237a7164Ab413BE226187F1',
  REPUTATION_REGISTRY_ADDRESS: '0x423a9904e39537a9997fbaF0f220d79D7d545763',
  PRISM_API_KEY: 'prism_sk_test',
  PRISM_BASE_URL: 'https://api.prismapi.ai',
  STRATEGY_TICK_INTERVAL_MS: '450000',
  INTERNAL_SERVICE_KEY: 'test-internal-service-key-at-least-32-characters',
  KRAKEN_CLI_PATH: 'kraken',
  STRATEGY_TRADE_AMOUNT_USD: '100',
  AGENT_ID: '018f5f93-1ecf-7cc0-bf2f-0d72f12a9c1b',
};

const ORIGINAL_ENV = process.env;

describe('validateStartupConfiguration', () => {
  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.resetModules();
  });

  it('passes with valid startup env', async () => {
    process.env = { ...BASE_ENV };
    const { validateStartupConfiguration } = await import('./startup');
    expect(() => validateStartupConfiguration()).not.toThrow();
  });

  it('fails when operator and agent wallets resolve to same address', async () => {
    process.env = {
      ...BASE_ENV,
      AGENT_WALLET_PRIVATE_KEY: BASE_ENV.OPERATOR_WALLET_PRIVATE_KEY,
    };

    const { validateStartupConfiguration } = await import('./startup');
    expect(() => validateStartupConfiguration()).toThrow(
      'operatorWallet and agentWallet must be different addresses',
    );
  });

  it('fails when PRISM env is missing', async () => {
    process.env = { ...BASE_ENV };
    delete process.env.PRISM_API_KEY;

    const { validateStartupConfiguration } = await import('./startup');
    expect(() => validateStartupConfiguration()).toThrow('Missing required PRISM_API_KEY');
  });

  it('fails when interval is below minimum', async () => {
    process.env = {
      ...BASE_ENV,
      STRATEGY_TICK_INTERVAL_MS: '999',
    };

    const { validateStartupConfiguration } = await import('./startup');
    expect(() => validateStartupConfiguration()).toThrow('Invalid STRATEGY_TICK_INTERVAL_MS');
  });
});