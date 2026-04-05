import { prisma } from '../../db/client.js';
import { generateId } from '../../lib/uuid.js';
import { generateApiKey } from '../../lib/crypto.js';
import type { RegisterAgentInput } from './agent.schema.js';

export async function registerAgent(input: RegisterAgentInput) {
  const id = generateId();
  const { raw, hash, prefix } = await generateApiKey();

  const agent = await prisma.agent.create({
    data: {
      id,
      name: input.name,
      walletAddress: input.walletAddress.toLowerCase(),
      strategyType: input.strategyType,
      chainId: input.chainId,
      metadataUri: input.metadataUri ?? null,
      apiKeyHash: hash,
      apiKeyPrefix: prefix
    },
    select: {
      id: true,
      name: true,
      walletAddress: true,
      strategyType: true,
      chainId: true,
      erc8004TokenId: true,
      registrationTxHash: true,
      vaultClaimedAt: true,
      createdAt: true
    } as never
  } as never);

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
