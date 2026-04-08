import { env } from './env.js';
import { agentAccount, operatorAccount } from '../lib/blockchain/client.js';
import { logger } from '../lib/logger.js';

export function validateStartupConfiguration() {
  const missingContracts: string[] = [];

  if (!env.IDENTITY_REGISTRY_ADDRESS && !env.AGENT_REGISTRY_ADDRESS) {
    missingContracts.push('IDENTITY_REGISTRY_ADDRESS or AGENT_REGISTRY_ADDRESS');
  }

  if (!env.RISK_ROUTER_ADDRESS) {
    missingContracts.push('RISK_ROUTER_ADDRESS');
  }

  if (!env.HACKATHON_VAULT_ADDRESS) {
    missingContracts.push('HACKATHON_VAULT_ADDRESS');
  }

  if (!env.VALIDATION_REGISTRY_ADDRESS) {
    missingContracts.push('VALIDATION_REGISTRY_ADDRESS');
  }

  if (!env.REPUTATION_REGISTRY_ADDRESS) {
    missingContracts.push('REPUTATION_REGISTRY_ADDRESS');
  }

  if (missingContracts.length > 0) {
    throw new Error(`Missing required contract addresses: ${missingContracts.join(', ')}`);
  }

  if (!env.PRISM_API_KEY) {
    throw new Error('Missing required PRISM_API_KEY');
  }

  if (!env.PRISM_BASE_URL) {
    throw new Error('Missing required PRISM_BASE_URL');
  }

  if (!env.STRATEGY_TICK_INTERVAL_MS || env.STRATEGY_TICK_INTERVAL_MS < 1000) {
    throw new Error('Invalid STRATEGY_TICK_INTERVAL_MS: must be at least 1000ms');
  }

  if (operatorAccount.address.toLowerCase() === agentAccount.address.toLowerCase()) {
    throw new Error('Invalid wallet configuration: OPERATOR and AGENT wallet addresses must be different');
  }

  logger.info(
    {
      startup: {
        operatorWallet: operatorAccount.address,
        agentWallet: agentAccount.address,
        sameWallet: false,
        strategyTickIntervalMs: env.STRATEGY_TICK_INTERVAL_MS,
        contracts: {
          identityRegistry: env.IDENTITY_REGISTRY_ADDRESS ?? env.AGENT_REGISTRY_ADDRESS,
          riskRouter: env.RISK_ROUTER_ADDRESS,
          hackathonVault: env.HACKATHON_VAULT_ADDRESS,
          validationRegistry: env.VALIDATION_REGISTRY_ADDRESS,
          reputationRegistry: env.REPUTATION_REGISTRY_ADDRESS,
        },
        prismBaseUrl: env.PRISM_BASE_URL,
      },
    },
    'Startup configuration validated',
  );
}
