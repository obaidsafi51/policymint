import { prisma } from '../../db/client.js';
import type { CreatePolicyInput } from './policy.schema.js';

export async function createPolicy(input: CreatePolicyInput) {
  return prisma.policy.create({
    data: {
      agentId: input.agentId,
      type: input.type,
      params: input.params,
      isActive: input.isActive
    },
    select: {
      id: true,
      agentId: true,
      type: true,
      params: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function listPoliciesByAgent(agentId: string) {
  return prisma.policy.findMany({
    where: { agentId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      type: true,
      params: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });
}
