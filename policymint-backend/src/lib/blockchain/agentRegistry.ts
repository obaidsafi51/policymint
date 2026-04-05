import { env } from '../../config/env.js';
import { logger } from '../logger.js';
import { AGENT_REGISTRY_ABI } from './abis.js';
import { agentAccount, operatorAccount, operatorWalletClient, publicClient } from './client.js';
import { txQueue } from './txQueue.js';

export interface RegisterAgentParams {
  name: string;
  description: string;
  capabilities: string[];
  agentURI: string;
}

export interface RegisterAgentResult {
  agentId: bigint;
  txHash: `0x${string}`;
}

const AGENT_REGISTRY = env.IDENTITY_REGISTRY_ADDRESS as `0x${string}` | undefined;

export function canRegisterAgentOnChain() {
  return Boolean(AGENT_REGISTRY);
}

export async function registerAgentOnChain(
  params: RegisterAgentParams,
): Promise<RegisterAgentResult> {
  if (!AGENT_REGISTRY) {
    throw new Error('IDENTITY_REGISTRY_ADDRESS missing; on-chain agent registration is disabled');
  }

  logger.info(
    {
      contract: 'AgentRegistry',
      name: params.name,
      capabilities: params.capabilities,
      operatorWallet: operatorAccount.address,
      agentWallet: agentAccount.address,
    },
    'Submitting register transaction',
  );

  const txHash = await txQueue.add(() =>
    operatorWalletClient.writeContract({
      address: AGENT_REGISTRY,
      abi: AGENT_REGISTRY_ABI,
      functionName: 'register',
      args: [agentAccount.address, params.name, params.description, params.capabilities, params.agentURI],
      account: operatorAccount,
    }),
  );

  logger.info({ contract: 'AgentRegistry', txHash }, 'register transaction submitted');

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
    timeout: 60_000,
  });

  if (receipt.status !== 'success') {
    throw new Error(`AgentRegistry.register() reverted. tx: ${txHash}`);
  }

  logger.info({ contract: 'AgentRegistry', txHash }, 'register transaction confirmed');

  let parsedAgentId = BigInt(0);
  const registryAddress = AGENT_REGISTRY.toLowerCase();

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== registryAddress) {
      continue;
    }

    if (log.topics[1]) {
      try {
        parsedAgentId = BigInt(log.topics[1]);
        if (parsedAgentId > BigInt(0)) {
          break;
        }
      } catch {
        continue;
      }
    }
  }

  if (parsedAgentId === BigInt(0)) {
    logger.error(
      {
        contract: 'AgentRegistry',
        txHash,
        logs: receipt.logs.map(log => ({
          address: log.address,
          topics: log.topics,
          data: log.data,
        })),
      },
      'agentId parse failed — dumping receipt logs for ABI diagnosis',
    );

    throw new Error(
      `agentId parsed as 0 — ABI event mismatch. Check AgentRegistry event logs: ` +
        `https://sepolia.etherscan.io/tx/${txHash}#eventlog`,
    );
  }

  return { agentId: parsedAgentId, txHash };
}
