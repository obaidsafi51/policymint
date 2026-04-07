import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/client.js';
import { canRegisterAgentOnChain, registerAgentOnChain } from '../../lib/blockchain/agentRegistry.js';
import { claimHackathonAllocation } from '../../lib/blockchain/hackathonVault.js';
import { generateApiKey } from '../../lib/crypto.js';
import { generateId } from '../../lib/uuid.js';
import { RegisterAgentSchema } from './agent.schema.js';
import { createAgentRecord, getAgentById, registerAgent, updateAgentApiKey } from './agent.service.js';

const AgentIdParamsSchema = z.object({
  id: z.string().uuid()
});

const RegistrationProgressParamsSchema = z.object({
  registrationId: z.string().uuid(),
});

const AGENT_METADATA_TYPE = 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1';
const REGISTRATION_JOB_TTL_MS = 15 * 60 * 1000;

type RegistrationStatus = 'pending' | 'active' | 'done' | 'failed';

interface RegistrationProgressEvent {
  stepNumber: number;
  stepLabel: string;
  status: RegistrationStatus;
  message: string;
  txHash?: `0x${string}`;
  done?: boolean;
  result?: {
    agent: {
      id: string;
      erc8004TokenId: string | null;
      registrationTxHash: string | null;
    };
    apiKey: string;
  };
}

interface RegistrationJob {
  id: string;
  events: RegistrationProgressEvent[];
  subscribers: Set<(event: RegistrationProgressEvent) => void>;
  completed: boolean;
}

const registrationJobs = new Map<string, RegistrationJob>();

const agentResponseSelect = {
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

function toDataUriJson(data: Record<string, unknown>) {
  const payload = Buffer.from(JSON.stringify(data), 'utf8').toString('base64');
  return `data:application/json;base64,${payload}`;
}

function createRegistrationJob(id: string): RegistrationJob {
  return {
    id,
    events: [],
    subscribers: new Set(),
    completed: false,
  };
}

function emitRegistrationEvent(job: RegistrationJob, event: RegistrationProgressEvent) {
  job.events.push(event);
  for (const listener of job.subscribers) {
    listener(event);
  }
}

function completeRegistrationJob(job: RegistrationJob) {
  job.completed = true;

  const timer = setTimeout(() => {
    registrationJobs.delete(job.id);
  }, REGISTRATION_JOB_TTL_MS);

  if (typeof (timer as NodeJS.Timeout).unref === 'function') {
    (timer as NodeJS.Timeout).unref();
  }
}

async function processRegistrationJob(
  app: FastifyInstance,
  job: RegistrationJob,
  input: z.infer<typeof RegisterAgentSchema>,
) {
  let currentStepNumber = 1;
  let currentStepLabel = 'Saving agent to database';
  let createdAgent:
    | {
        id: string;
        erc8004TokenId: string | null;
        registrationTxHash: string | null;
      }
    | null = null;
  let responseAgent:
    | {
        id: string;
        erc8004TokenId: string | null;
        registrationTxHash: string | null;
      }
    | null = null;
  let onChainAgentId: bigint | null = null;
  let revealedApiKey = '';

  try {
    emitRegistrationEvent(job, {
      stepNumber: 1,
      stepLabel: 'Saving agent to database',
      status: 'active',
      message: 'Creating agent record in PostgreSQL',
    });

    const temporaryApiKey = await generateApiKey();
    createdAgent = await createAgentRecord(input, {
      hash: temporaryApiKey.hash,
      prefix: temporaryApiKey.prefix,
    });

    responseAgent = {
      id: createdAgent.id,
      erc8004TokenId: createdAgent.erc8004TokenId,
      registrationTxHash: createdAgent.registrationTxHash,
    };

    emitRegistrationEvent(job, {
      stepNumber: 1,
      stepLabel: 'Saving agent to database',
      status: 'done',
      message: 'Agent record created',
    });

    currentStepNumber = 2;
    currentStepLabel = 'Registering on-chain identity';
    emitRegistrationEvent(job, {
      stepNumber: 2,
      stepLabel: 'Registering on-chain identity',
      status: 'active',
      message: 'Calling AgentRegistry.registerAgent()',
    });

    if (canRegisterAgentOnChain()) {
      const frontendUrl = 'https://policymint.vercel.app';
      const agentURI = input.metadataUri
        ? input.metadataUri
        : toDataUriJson({
            type: AGENT_METADATA_TYPE,
            name: input.name,
            description: `${input.strategyType} strategy agent managed by PolicyMint`,
            services: [
              {
                type: 'dashboard',
                endpoint: frontendUrl,
              },
            ],
            active: true,
          });

      const { agentId, txHash } = await registerAgentOnChain({
        name: input.name,
        description: `${input.strategyType} strategy agent managed by PolicyMint`,
        capabilities: ['policy-evaluation', 'risk-routing', 'eip712-signing'],
        agentURI,
      });

      onChainAgentId = agentId;

      const updatedAgent = await prisma.agent.update({
        where: { id: createdAgent.id },
        data: {
          erc8004TokenId: agentId.toString(),
          registrationTxHash: txHash,
        },
        select: {
          id: true,
          erc8004TokenId: true,
          registrationTxHash: true,
        },
      } as never);

      responseAgent = updatedAgent;

      emitRegistrationEvent(job, {
        stepNumber: 2,
        stepLabel: 'Registering on-chain identity',
        status: 'done',
        message: 'Agent identity registered on Ethereum Sepolia',
        txHash,
      });
    } else {
      emitRegistrationEvent(job, {
        stepNumber: 2,
        stepLabel: 'Registering on-chain identity',
        status: 'done',
        message: 'On-chain registration skipped (registry not configured)',
      });
    }

    currentStepNumber = 3;
    currentStepLabel = 'Claiming sandbox capital';
    emitRegistrationEvent(job, {
      stepNumber: 3,
      stepLabel: 'Claiming sandbox capital',
      status: 'active',
      message: 'Calling HackathonVault.claimAllocation()',
    });

    if (onChainAgentId !== null) {
      const claimTxHash = await claimHackathonAllocation(onChainAgentId);

      const updatedAgent = await prisma.agent.update({
        where: { id: createdAgent.id },
        data: { vaultClaimedAt: new Date() },
        select: {
          id: true,
          erc8004TokenId: true,
          registrationTxHash: true,
        },
      } as never);

      responseAgent = updatedAgent;

      emitRegistrationEvent(job, {
        stepNumber: 3,
        stepLabel: 'Claiming sandbox capital',
        status: 'done',
        message: 'Sandbox capital claimed',
        txHash: claimTxHash,
      });
    } else {
      emitRegistrationEvent(job, {
        stepNumber: 3,
        stepLabel: 'Claiming sandbox capital',
        status: 'done',
        message: 'Capital claim skipped because on-chain agent ID was not created',
      });
    }

    currentStepNumber = 4;
    currentStepLabel = 'Storing on-chain agent ID';
    emitRegistrationEvent(job, {
      stepNumber: 4,
      stepLabel: 'Storing on-chain agent ID',
      status: 'active',
      message: 'Persisting agentId in agents.erc8004_token_id',
    });

    emitRegistrationEvent(job, {
      stepNumber: 4,
      stepLabel: 'Storing on-chain agent ID',
      status: 'done',
      message: onChainAgentId !== null
        ? 'On-chain agent ID stored'
        : 'No on-chain ID to store; step completed',
    });

    currentStepNumber = 5;
    currentStepLabel = 'Generating API key';
    emitRegistrationEvent(job, {
      stepNumber: 5,
      stepLabel: 'Generating API key',
      status: 'active',
      message: 'Generating and hashing scoped API key',
    });

    const finalApiKey = await generateApiKey();
    revealedApiKey = finalApiKey.raw;

    const updatedAgent = await updateAgentApiKey(createdAgent.id, {
      hash: finalApiKey.hash,
      prefix: finalApiKey.prefix,
    });

    responseAgent = {
      id: updatedAgent.id,
      erc8004TokenId: updatedAgent.erc8004TokenId,
      registrationTxHash: updatedAgent.registrationTxHash,
    };

    emitRegistrationEvent(job, {
      stepNumber: 5,
      stepLabel: 'Generating API key',
      status: 'done',
      message: 'API key generated successfully',
      done: true,
      result: {
        agent: {
          id: responseAgent.id,
          erc8004TokenId: responseAgent.erc8004TokenId,
          registrationTxHash: responseAgent.registrationTxHash,
        },
        apiKey: revealedApiKey,
      },
    });
  } catch (err) {
    app.log.error({ err, registration_id: job.id, step: currentStepLabel }, 'Agent registration job failed');
    emitRegistrationEvent(job, {
      stepNumber: currentStepNumber,
      stepLabel: currentStepLabel,
      status: 'failed',
      message: err instanceof Error ? err.message : 'Unknown registration error',
    });
  } finally {
    completeRegistrationJob(job);
  }
}

export async function agentRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const body = RegisterAgentSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(422).send({ error: body.error.flatten() });
    }

    const existingAgent = await prisma.agent.findFirst({
      where: {
        walletAddress: body.data.walletAddress.toLowerCase(),
        name: body.data.name,
      },
      select: {
        id: true,
        name: true,
        walletAddress: true,
        erc8004TokenId: true,
      },
    } as never);

    if (existingAgent) {
      return reply.status(409).send({
        message: 'Agent already registered for this wallet and name',
        existingAgent,
      });
    }

    const registrationId = generateId();
    const job = createRegistrationJob(registrationId);
    registrationJobs.set(registrationId, job);

    void processRegistrationJob(app, job, body.data);

    return reply.status(202).send({ registrationId });
  });

  app.get('/register/:registrationId/progress', async (request, reply) => {
    const params = RegistrationProgressParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(422).send({ error: params.error.flatten() });
    }

    const job = registrationJobs.get(params.data.registrationId);
    if (!job) {
      return reply.status(404).send({ error: 'Registration job not found or expired' });
    }

    reply.hijack();
    reply.raw.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no');
    reply.raw.flushHeaders?.();

    let heartbeat: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
      job.subscribers.delete(sendEvent);
    };

    const sendEvent = (event: RegistrationProgressEvent) => {
      if (reply.raw.writableEnded) {
        return;
      }

      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);

      if (event.done || event.status === 'failed') {
        cleanup();
        reply.raw.end();
      }
    };

    reply.raw.write(': connected\n\n');
    for (const event of job.events) {
      sendEvent(event);
    }

    if (job.completed) {
      reply.raw.end();
      return;
    }

    job.subscribers.add(sendEvent);

    heartbeat = setInterval(() => {
      if (!reply.raw.writableEnded) {
        reply.raw.write(': keep-alive\n\n');
      }
    }, 15_000);

    request.raw.on('close', () => {
      cleanup();
    });
  });

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
          select: agentResponseSelect,
        } as never);

        if (!agentBeforeClaim?.vaultClaimedAt) {
          try {
            await claimHackathonAllocation(agentId);

            try {
              responseAgent = await prisma.agent.update({
                where: { id: result.agent.id },
                data: {
                  vaultClaimedAt: new Date(),
                },
                select: agentResponseSelect,
              } as never);
            } catch (persistErr) {
              app.log.error(
                { err: persistErr, agent_id: result.agent.id, agent_token_id: agentId.toString() },
                'Vault claim succeeded but persisting vaultClaimedAt failed',
              );
            }
          } catch (claimErr) {
            app.log.error(
              { err: claimErr, agent_id: result.agent.id, agent_token_id: agentId.toString() },
              'Vault claim failed after successful on-chain registration; continuing without vaultClaimedAt',
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
