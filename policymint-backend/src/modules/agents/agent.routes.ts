import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/client.js';
import { canRegisterAgentOnChain, registerAgentOnChain } from '../../lib/blockchain/agentRegistry.js';
import { claimHackathonAllocation } from '../../lib/blockchain/hackathonVault.js';
import { RegisterAgentSchema } from './agent.schema.js';
import { registerAgent, getAgentById } from './agent.service.js';

const AgentIdParamsSchema = z.object({
  id: z.string().uuid()
});

const AGENT_METADATA_TYPE = 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1';

function toDataUriJson(data: Record<string, unknown>) {
  const payload = Buffer.from(JSON.stringify(data), 'utf8').toString('base64');
  return `data:application/json;base64,${payload}`;
}

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
        const frontendUrl = 'https://policymint.vercel.app';
        const agentURI = body.data.metadataUri
          ? body.data.metadataUri
          : toDataUriJson({
              type: AGENT_METADATA_TYPE,
              name: body.data.name,
              description: `${body.data.strategyType} strategy agent managed by PolicyMint`,
              services: [
                {
                  type: 'dashboard',
                  endpoint: frontendUrl,
                },
              ],
              active: true,
            });

        const { agentId, txHash } = await registerAgentOnChain({
          name: body.data.name,
          description: `${body.data.strategyType} strategy agent managed by PolicyMint`,
          capabilities: ['policy-evaluation', 'risk-routing', 'eip712-signing'],
          agentURI,
        });

        const agentBeforeClaim = await prisma.agent.findUnique({
          where: { id: result.agent.id },
          select: {
            id: true,
            vaultClaimedAt: true,
          },
        } as never) as { id: string; vaultClaimedAt: Date | null } | null;

        responseAgent = await prisma.agent.update({
          where: { id: result.agent.id },
          data: {
            erc8004TokenId: agentId.toString(),
            registrationTxHash: txHash,
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

        if (!agentBeforeClaim?.vaultClaimedAt) {
          try {
            await claimHackathonAllocation(agentId);

            responseAgent = await prisma.agent.update({
              where: { id: result.agent.id },
              data: {
                vaultClaimedAt: new Date(),
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
          } catch (claimErr) {
            app.log.error(
              { err: claimErr, agent_id: result.agent.id, agent_token_id: agentId.toString() },
              'Vault claim failed after successful on-chain registration',
            );
          }
        }
      } catch (err) {
        app.log.error({ err, agent_id: result.agent.id }, 'On-chain agent registration failed');
      }
    } else {
      app.log.warn(
        'IDENTITY_REGISTRY_ADDRESS/AGENT_REGISTRY_ADDRESS missing; skipping on-chain registration',
      );
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
