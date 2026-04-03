import { prisma } from '../../db/client';
import { generateId } from '../../lib/uuid';
import { generateApiKey } from '../../lib/crypto';
import type { RegisterAgentInput } from './agent.schema';

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
      createdAt: true
    }
  });

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
      isActive: true,
      createdAt: true,
      _count: { select: { policies: true, evaluations: true } }
    }
  });
}
