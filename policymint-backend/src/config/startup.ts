import { accessSync, constants } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { privateKeyToAccount } from 'viem/accounts';
import { env } from './env.js';
import { logger } from '../lib/logger.js';
import { setKrakenCliReadiness } from '../exchange/kraken-readiness.js';

function checkKrakenCliReadiness(): { ready: boolean; reason: string | null } {
  try {
    accessSync(env.KRAKEN_CLI_PATH, constants.X_OK);
  } catch {
    return {
      ready: false,
      reason: `Kraken CLI not executable at path: ${env.KRAKEN_CLI_PATH}`,
    };
  }

  const version = spawnSync(env.KRAKEN_CLI_PATH, ['--version'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });

  if (version.error) {
    return {
      ready: false,
      reason: `Kraken CLI --version failed: ${version.error.message}`,
    };
  }

  if (version.status !== 0) {
    return {
      ready: false,
      reason: `Kraken CLI --version exited with status ${version.status}`,
    };
  }

  return {
    ready: true,
    reason: null,
  };
}

export function validateStartupConfiguration(): void {
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

  const operatorAddress = privateKeyToAccount(env.OPERATOR_WALLET_PRIVATE_KEY as `0x${string}`).address;
  const agentAddress = privateKeyToAccount(env.AGENT_WALLET_PRIVATE_KEY as `0x${string}`).address;

  const krakenCli = checkKrakenCliReadiness();
  setKrakenCliReadiness({ ready: krakenCli.ready, reason: krakenCli.reason });

  if (env.KRAKEN_EXECUTION_ENABLED && !krakenCli.ready) {
    logger.warn(
      {
        kraken_cli_path: env.KRAKEN_CLI_PATH,
        reason: krakenCli.reason,
      },
      'KRAKEN_EXECUTION_ENABLED=true but Kraken CLI is not ready; Kraken execution path will be skipped at runtime',
    );
  }

  if (operatorAddress.toLowerCase() === agentAddress.toLowerCase()) {
    throw new Error('Invalid wallet config: operatorWallet and agentWallet must be different addresses');
  }

  logger.info(
    {
      startup: {
        operatorWallet: operatorAddress,
        agentWallet: agentAddress,
        sameWallet: false,
        strategyTickIntervalMs: env.STRATEGY_TICK_INTERVAL_MS,
        kraken: {
          cliPath: env.KRAKEN_CLI_PATH,
          paperTrading: env.KRAKEN_PAPER_TRADING,
          executionEnabled: env.KRAKEN_EXECUTION_ENABLED,
          cliReady: krakenCli.ready,
        },
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