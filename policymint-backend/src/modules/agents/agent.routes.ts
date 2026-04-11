import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/client.js';
import { canRegisterAgentOnChain, registerAgentOnChain } from '../../lib/blockchain/agentRegistry.js';
import { claimHackathonAllocation } from '../../lib/blockchain/hackathonVault.js';
import { agentAccount, operatorAccount } from '../../lib/blockchain/client.js';
import { generateApiKey } from '../../lib/crypto.js';
import { generateId } from '../../lib/uuid.js';
import { operatorJwtAuth } from '../../plugins/operator-auth.js';
import { RegisterAgentSchema } from './agent.schema.js';
import { createAgentRecord, getAgentById, registerAgent, updateAgentApiKey } from './agent.service.js';
import {
  buildCanonicalAgentURI,
  CANONICAL_AGENT_CAPABILITIES,
  CANONICAL_AGENT_DESCRIPTION,
  CANONICAL_AGENT_NAME,
} from './registration.constants.js';

const AgentIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const RegistrationProgressParamsSchema = z.object({
  registrationId: z.string().uuid(),
});

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
    agent_id?: string;
    erc8004_token_id?: string | null;
    vault_claim_tx_hash?: string | null;
    vault_claim_status?: 'claimed' | 'pending_retry' | 'skipped';
    vault_claim_error?: string | null;
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
  let vaultClaimTxHash: `0x${string}` | null = null;
  let vaultClaimError: string | null = null;

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
      const frontendUrl = process.env.POLICYMINT_FRONTEND_URL ?? 'https://your-vercel-frontend-url.vercel.app';
      const agentURI = buildCanonicalAgentURI(frontendUrl);
      const strategyCapability = `strategy:${input.strategyType.toLowerCase()}`;

      const { agentId, txHash } = await registerAgentOnChain({
        name: input.name,
        description: input.description?.trim() || CANONICAL_AGENT_DESCRIPTION,
        capabilities: [...CANONICAL_AGENT_CAPABILITIES, strategyCapability],
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
      try {
        const claimTxHash = await claimHackathonAllocation(onChainAgentId);
        vaultClaimTxHash = claimTxHash;

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
      } catch (claimErr) {
        vaultClaimError = claimErr instanceof Error ? claimErr.message : 'Vault claim failed';
        app.log.error(
          { err: claimErr, registration_id: job.id, onchain_agent_id: onChainAgentId.toString() },
          'Vault claim failed during registration; registration will continue and allow explicit retry',
        );

        emitRegistrationEvent(job, {
          stepNumber: 3,
          stepLabel: 'Claiming sandbox capital',
          status: 'done',
          message: `Vault claim failed — retry required: ${vaultClaimError}`,
        });
      }
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
      message: onChainAgentId !== null ? 'On-chain agent ID stored' : 'No on-chain ID to store; step completed',
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
        agent_id: responseAgent.id,
        erc8004_token_id: responseAgent.erc8004TokenId,
        vault_claim_tx_hash: vaultClaimTxHash,
        vault_claim_status: onChainAgentId === null ? 'skipped' : vaultClaimTxHash ? 'claimed' : 'pending_retry',
        vault_claim_error: vaultClaimError,
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
  app.get('/register/config', { preHandler: operatorJwtAuth }, async (request, reply) => {
    if (!request.operatorContext) {
      return reply.status(401).send({ error: 'Operator authentication required' });
    }

    return reply.send({
      operatorWallet: operatorAccount.address,
      agentWallet: agentAccount.address,
      contract: 'AgentRegistry',
    });
  });

  app.post('/register', { preHandler: operatorJwtAuth }, async (request, reply) => {
    if (!request.operatorContext) {
      return reply.status(401).send({ error: 'Operator authentication required' });
    }

    const expectedOperatorWallet = operatorAccount.address.toLowerCase();
    if (request.operatorContext.operatorWallet.toLowerCase() !== expectedOperatorWallet) {
      return reply.status(403).send({
        error: 'Connected SIWE wallet is not the configured operator wallet',
        operatorWallet: operatorAccount.address,
      });
    }

    const body = RegisterAgentSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(422).send({ error: body.error.flatten() });
    }

    const existingAgent = await prisma.agent.findFirst({
      where: {
        walletAddress: body.data.walletAddress.toLowerCase(),
        erc8004TokenId: {
          not: null,
        },
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
        message: 'Agent already registered for this wallet',
        existingAgent,
      });
    }

    const registrationId = generateId();
    const job = createRegistrationJob(registrationId);
    registrationJobs.set(registrationId, job);

    void processRegistrationJob(app, job, body.data);

    return reply.status(202).send({ registrationId });
  });

  app.post<{ Params: { id: string } }>('/:id/retry-vault-claim', { preHandler: operatorJwtAuth }, async (request, reply) => {
    if (!request.operatorContext) {
      return reply.status(401).send({ error: 'Operator authentication required' });
    }

    const expectedOperatorWallet = operatorAccount.address.toLowerCase();
    if (request.operatorContext.operatorWallet.toLowerCase() !== expectedOperatorWallet) {
      return reply.status(403).send({
        error: 'Connected SIWE wallet is not the configured operator wallet',
        operatorWallet: operatorAccount.address,
      });
    }

    const parsedParams = AgentIdParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.status(422).send({ error: parsedParams.error.flatten() });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: parsedParams.data.id },
      select: {
        id: true,
        walletAddress: true,
        erc8004TokenId: true,
        vaultClaimedAt: true,
      },
    } as never);

    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    if (agent.walletAddress.toLowerCase() !== request.operatorContext.operatorWallet.toLowerCase()) {
      return reply.status(403).send({ error: 'Operator is not authorized for this agent' });
    }

    if (!agent.erc8004TokenId) {
      return reply.status(409).send({ error: 'Agent has no on-chain ERC8004 token id yet' });
    }

    if (agent.vaultClaimedAt) {
      return reply.send({
        agent_id: agent.id,
        erc8004_token_id: agent.erc8004TokenId,
        vault_claim_tx_hash: null,
        status: 'already_claimed',
      });
    }

    const claimTxHash = await claimHackathonAllocation(BigInt(agent.erc8004TokenId));
    await prisma.agent.update({
      where: { id: agent.id },
      data: { vaultClaimedAt: new Date() },
    });

    return reply.send({
      agent_id: agent.id,
      erc8004_token_id: agent.erc8004TokenId,
      vault_claim_tx_hash: claimTxHash,
      status: 'claimed',
    });
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
      if (reply.raw.writableEnded) return;

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
      const frontendUrl = process.env.POLICYMINT_FRONTEND_URL ?? 'https://your-vercel-frontend-url.vercel.app';
      const agentURI = buildCanonicalAgentURI(frontendUrl);
      let onChainRegistration: { agentId: bigint; txHash: `0x${string}` } | null = null;
      const strategyCapability = `strategy:${body.data.strategyType.toLowerCase()}`;

      try {
        onChainRegistration = await registerAgentOnChain({
          name: body.data.name,
          description: body.data.description?.trim() || CANONICAL_AGENT_DESCRIPTION,
          capabilities: [...CANONICAL_AGENT_CAPABILITIES, strategyCapability],
          agentURI,
        });
      } catch (err) {
        app.log.error({ err, agent_id: result.agent.id }, 'On-chain agent registration failed');
      }

      if (onChainRegistration) {
        const { agentId, txHash } = onChainRegistration;

        const agentBeforeClaim = (await prisma.agent.findUnique({
          where: { id: result.agent.id },
          select: {
            id: true,
            vaultClaimedAt: true,
          },
        } as never)) as { id: string; vaultClaimedAt: Date | null } | null;

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
      }
    } else {
      app.log.warn('IDENTITY_REGISTRY_ADDRESS/AGENT_REGISTRY_ADDRESS missing; skipping on-chain registration');
    }

    return reply.status(201).send({
      agent: responseAgent,
      apiKey: result.apiKey,
      _notice: 'Store your apiKey securely. It will not be shown again.',
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