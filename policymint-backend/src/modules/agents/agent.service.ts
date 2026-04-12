import { prisma } from '../../db/client.js';
import { generateId } from '../../lib/uuid.js';
import { generateApiKey } from '../../lib/crypto.js';
import type { RegisterAgentInput } from './agent.schema.js';

const baseAgentSelect = {
  id: true,
  name: true,
  walletAddress: true,
  strategyType: true,
  chainId: true,
  erc8004TokenId: true,
  registrationTxHash: true,
  vaultClaimedAt: true,
  createdAt: true,
};

interface PersistedApiKey {
  hash: string;
  prefix: string;
}

export async function createAgentRecord(
  input: RegisterAgentInput,
  apiKey: PersistedApiKey,
  id = generateId(),
  operatorWallet?: string
) {
  return prisma.agent.create({
    data: {
      id,
      name: input.name,
      walletAddress: input.walletAddress.toLowerCase(),
      deployerWalletAddress: operatorWallet ? operatorWallet.toLowerCase() : null,
      strategyType: input.strategyType,
      chainId: input.chainId,
      metadataUri: input.metadataUri ?? null,
      apiKeyHash: apiKey.hash,
      apiKeyPrefix: apiKey.prefix,
    },
    select: baseAgentSelect as never,
  } as never);
}

export async function updateAgentApiKey(agentId: string, apiKey: PersistedApiKey) {
  return prisma.agent.update({
    where: { id: agentId },
    data: {
      apiKeyHash: apiKey.hash,
      apiKeyPrefix: apiKey.prefix,
    },
    select: baseAgentSelect as never,
  } as never);
}

export async function registerAgent(input: RegisterAgentInput, operatorWallet?: string) {
  const { raw, hash, prefix } = await generateApiKey();
  const agent = await createAgentRecord(input, { hash, prefix }, undefined, operatorWallet);

  return { agent, apiKey: raw };
}

export async function getAgentById(id: string) {
  return prisma.agent.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      walletAddress: true,
      strategyType: true,
      chainId: true,
      erc8004TokenId: true,
      registrationTxHash: true,
      vaultClaimedAt: true,
      isActive: true,
      createdAt: true,
      _count: { select: { policies: true, evaluations: true } }
    } as never
  } as never);
}
