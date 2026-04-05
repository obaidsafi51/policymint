import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/client';
import { canRegisterAgentOnChain, registerAgentOnChain } from '../../lib/blockchain/agentRegistry';
import { claimHackathonAllocation } from '../../lib/blockchain/hackathonVault';
import { RegisterAgentSchema } from './agent.schema';
import { registerAgent, getAgentById } from './agent.service';

const AgentIdParamsSchema = z.object({
  id: z.string().uuid()
});

export async function agentRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    const body = RegisterAgentSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(422).send({ error: body.error.flatten() });
    }

    const result = await registerAgent(body.data);
    let responseAgent = result.agent;

    if (canRegisterAgentOnChain()) {
      try {
        const metadataURI = body.data.metadataUri ?? `https://policymint.xyz/agents/${result.agent.id}`;
        const { agentId, txHash } = await registerAgentOnChain({
          name: body.data.name,
          metadataURI,
          strategyType: body.data.strategyType.toLowerCase(),
        });

        const agentBeforeClaim = await prisma.agent.findUnique({
          where: { id: result.agent.id },
          select: {
            id: true,
            vaultClaimedAt: true,
          },
        } as never) as { id: string; vaultClaimedAt: Date | null } | null;

        if (!agentBeforeClaim?.vaultClaimedAt) {
          await claimHackathonAllocation(agentId);
        }

        responseAgent = await prisma.agent.update({
          where: { id: result.agent.id },
          data: {
            erc8004TokenId: agentId.toString(),
            registrationTxHash: txHash,
            vaultClaimedAt: agentBeforeClaim?.vaultClaimedAt ?? new Date(),
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
            createdAt: true,
          },
        } as never);
      } catch (err) {
        app.log.error({ err, agent_id: result.agent.id }, 'On-chain agent registration failed');
      }
    } else {
      app.log.warn('IDENTITY_REGISTRY_ADDRESS missing; skipping on-chain registration');
    }

    return reply.status(201).send({
      agent: responseAgent,
      apiKey: result.apiKey,
      _notice: 'Store your apiKey securely. It will not be shown again.'
    });
  });
}

export async function agentProtectedRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const parsedParams = AgentIdParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.status(422).send({ error: parsedParams.error.flatten() });
    }

    const agent = await getAgentById(request.params.id);
    if (!agent) {
      return reply.notFound('Agent not found');
    }
    return reply.send(agent);
  });
}
