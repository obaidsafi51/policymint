import { privateKeyToAccount } from 'viem/accounts';
import { env } from './env.js';

function assertHexAddress(value: string | undefined, label: string): asserts value is `0x${string}` {
  if (!value) {
    throw new Error(`Missing required ${label}`);
  }
}

export function validateStartupConfiguration(): void {
  assertHexAddress(env.IDENTITY_REGISTRY_ADDRESS, 'IDENTITY_REGISTRY_ADDRESS');
  assertHexAddress(env.VALIDATION_REGISTRY_ADDRESS, 'VALIDATION_REGISTRY_ADDRESS');
  assertHexAddress(env.REPUTATION_REGISTRY_ADDRESS, 'REPUTATION_REGISTRY_ADDRESS');
  assertHexAddress(env.RISK_ROUTER_ADDRESS, 'RISK_ROUTER_ADDRESS');
  assertHexAddress(env.HACKATHON_VAULT_ADDRESS, 'HACKATHON_VAULT_ADDRESS');

  if (!env.PRISM_API_KEY) {
    throw new Error('Missing required PRISM_API_KEY');
  }

  if (!env.PRISM_BASE_URL) {
    throw new Error('Missing required PRISM_BASE_URL');
  }

  if (!env.STRATEGY_TICK_INTERVAL_MS || env.STRATEGY_TICK_INTERVAL_MS < 1_000) {
    throw new Error('Invalid STRATEGY_TICK_INTERVAL_MS: must be at least 1000ms');
  }

  const operatorAddress = privateKeyToAccount(env.OPERATOR_WALLET_PRIVATE_KEY as `0x${string}`).address;
  const agentAddress = privateKeyToAccount(env.AGENT_WALLET_PRIVATE_KEY as `0x${string}`).address;

  if (operatorAddress.toLowerCase() === agentAddress.toLowerCase()) {
    throw new Error('Invalid wallet config: operatorWallet and agentWallet must be different addresses');
  }
}
