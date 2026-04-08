import type { FastifyInstance } from 'fastify';
import { RegistryType, SignalType } from '@prisma/client';
import { keccak256, toHex } from 'viem';
import { prisma } from '../../db/client.js';
import { verifyApiKey } from '../../lib/crypto.js';
import { env } from '../../config/env.js';
import { captureError } from '../../lib/sentry.js';
import { EvaluateIntentSchema } from './evaluate.schema.js';
import { evaluateIntent } from './evaluate.service.js';
import {
  canPostValidationOnChain,
  postValidationRecord,
} from '../../lib/blockchain/validationRegistry.js';
import {
  canEmitReputationSignalOnChain,
  FeedbackType,
  emitReputationSignal,
} from '../../lib/blockchain/reputationRegistry.js';
import { submitTradeIntent } from '../../lib/blockchain/riskRouter.js';

const API_KEY_PREFIX = 'pm_live_';
const PREFIX_LOOKUP_LENGTH = API_KEY_PREFIX.length + 8;
const RATE_LIMIT_TIME_WINDOW = env.NODE_ENV === 'test' ? '1 minute' : '1 second';
type FeedbackTypeValue = (typeof FeedbackType)[keyof typeof FeedbackType];
type ExecutionState = 'confirmed' | 'unconfirmed' | 'not-applicable';
type ExecutionErrorTag = 'execution_reverted' | 'execution_timeout' | 'rpc_error' | 'signing_error';
const REPUTATION_MAX_RETRIES = 3;

function classifyExecutionError(error: unknown): ExecutionErrorTag {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('timeout') || message.includes('timed out') || message.includes('abort')) {
    return 'execution_timeout';
  }

  if (message.includes('sign') || message.includes('signature')) {
    return 'signing_error';
  }

  if (message.includes('rpc') || message.includes('http') || message.includes('network')) {
    return 'rpc_error';
  }

  return 'execution_reverted';
}

function resolveAttestationScore(input: {
  result: 'allow' | 'block';
  reason: string | null;
  executionState: ExecutionState;
}): number {
  if (input.result === 'allow') {
    return input.executionState === 'confirmed' ? 95 : 70;
  }

  const reason = (input.reason ?? '').toLowerCase();
  if (reason.includes('malformed') || reason.includes('invalid')) {
    return 20;
  }

  return 40;
}

function resolveFeedback(input: {
  result: 'allow' | 'block';
  reason: string | null;
  executionState: ExecutionState;
}): { score: number; feedbackType: FeedbackTypeValue; comment: string; signalType: SignalType } {
  if (input.result === 'allow') {
    if (input.executionState === 'confirmed') {
      return {
        score: 80,
        feedbackType: FeedbackType.POSITIVE,
        comment: 'Trade executed within policy bounds',
        signalType: SignalType.POSITIVE,
      };
    }

    return {
      score: 50,
      feedbackType: FeedbackType.NEUTRAL,
      comment: 'Trade allowed but execution failed',
      signalType: SignalType.NEGATIVE,
    };
  }

  const reason = input.reason ?? 'blocked by policy';
  const normalized = reason.toLowerCase();
  if (normalized.includes('riskrouter') || normalized.includes('hard limit')) {
    return {
      score: 10,
      feedbackType: FeedbackType.NEGATIVE,
      comment: `Trade blocked: RiskRouter hard limit exceeded (${reason})`,
      signalType: SignalType.NEGATIVE,
    };
  }

  const policyRule = reason.split(':')[0] ?? reason;

  return {
    score: 20,
    feedbackType: FeedbackType.NEGATIVE,
    comment: `Trade blocked: ${policyRule} violated`,
    signalType: SignalType.NEGATIVE,
  };
}

function toOutcomeRef(evaluationId: string): `0x${string}` {
  return keccak256(toHex(evaluationId));
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

async function emitReputationWithRetry(input: {
  agentId: string;
  agentTokenId: string;
  evaluationId: string;
  feedback: { score: number; feedbackType: FeedbackTypeValue; comment: string; signalType: SignalType };
  app: FastifyInstance;
}) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= REPUTATION_MAX_RETRIES; attempt += 1) {
    try {
      const reputationTxHash = await emitReputationSignal({
        agentId: BigInt(input.agentTokenId),
        score: input.feedback.score,
        feedbackType: input.feedback.feedbackType,
        outcomeRef: toOutcomeRef(input.evaluationId),
        comment: input.feedback.comment,
      });

      await prisma.reputationSignal.create({
        data: {
          agentId: input.agentId,
          signalType: input.feedback.signalType,
          cycleId: input.evaluationId,
          txHash: reputationTxHash,
          scoreSnapshot: input.feedback.score,
          emittedAt: new Date(),
        },
      });

      await prisma.reputationLog.create({
        data: {
          agentId: input.agentId,
          evaluationId: input.evaluationId,
          attempt,
          status: 'submitted',
          txHash: reputationTxHash,
          errorMessage: null,
        },
      });

      return;
    } catch (error) {
      lastError = error;
      await prisma.reputationLog.create({
        data: {
          agentId: input.agentId,
          evaluationId: input.evaluationId,
          attempt,
          status: 'failed',
          txHash: null,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      input.app.log.warn(
        { err: error, evaluation_id: input.evaluationId, attempt },
        'submitFeedback attempt failed',
      );
      if (attempt < REPUTATION_MAX_RETRIES) {
        await wait(2 ** (attempt - 1) * 250);
      }
    }
  }

  captureError(lastError, {
    evaluation_id: input.evaluationId,
    function: 'ReputationRegistry.submitFeedback',
  });
}

async function persistValidationEmission(input: {
  evaluationId: string;
  agentTokenId: string;
  validation: Awaited<ReturnType<typeof postValidationRecord>>;
}) {
  await prisma.$transaction(async tx => {
    await tx.intentEvaluation.update({
      where: { id: input.evaluationId },
      data: {
        validationTxHash: input.validation.txHash,
        emittedAt: new Date(),
      },
    });

    const existingValidationRecord = await tx.validationRecord.findFirst({
      where: {
        evaluationId: input.evaluationId,
        registryType: RegistryType.ERC8004,
      },
      select: { id: true },
    });

    if (existingValidationRecord) {
      await tx.validationRecord.update({
        where: { id: existingValidationRecord.id },
        data: {
          txHash: input.validation.txHash,
          blockNumber: input.validation.blockNumber,
          outcomeRef: toOutcomeRef(input.evaluationId),
          strategyCheckpointHash: input.validation.checkpointHash,
          emittedAt: new Date(),
          confirmedAt: new Date(),
          agentTokenId: input.agentTokenId,
        },
      } as never);
      return;
    }

    await tx.validationRecord.create({
      data: {
        evaluationId: input.evaluationId,
        registryType: RegistryType.ERC8004,
        txHash: input.validation.txHash,
        blockNumber: input.validation.blockNumber,
        outcomeRef: toOutcomeRef(input.evaluationId),
        strategyCheckpointHash: input.validation.checkpointHash,
        emittedAt: new Date(),
        confirmedAt: new Date(),
        agentTokenId: input.agentTokenId,
      },
    } as never);
  });
}

function getBearerToken(authorizationHeader: string | string[] | undefined): string | null {
  if (!authorizationHeader || Array.isArray(authorizationHeader)) {
    return null;
  }

  if (!authorizationHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();
  if (!token.startsWith(API_KEY_PREFIX)) {
    return null;
  }

  return token;
}

function isEvaluationServiceErrorLike(
  error: unknown,
): error is { name?: string; message: string; statusCode: number } {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { name?: unknown; message?: unknown; statusCode?: unknown };
  const hasStatusCode = typeof candidate.statusCode === 'number';
  const hasMessage = typeof candidate.message === 'string';
  const hasName = candidate.name === 'EvaluationServiceError';

  return hasMessage && hasStatusCode && hasName;
}

export async function evaluateRoutes(app: FastifyInstance) {
  app.post('/evaluate', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: RATE_LIMIT_TIME_WINDOW,
        keyGenerator: request => {
          const auth = request.headers.authorization;

          if (typeof auth === 'string' && auth.length > 0) {
            return auth;
          }

          if (Array.isArray(auth) && typeof auth[0] === 'string' && auth[0].length > 0) {
            return auth[0];
          }

          return request.ip;
        },
        errorResponseBuilder: (_request, context) => ({
          statusCode: 429,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Max ${context.max} requests per second per authorization key.`
        })
      }
    }
  }, async (request, reply) => {
    const body = EvaluateIntentSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.flatten() });
    }

    const internalKey = request.headers['x-internal-key'];
    const isInternalCall =
      typeof internalKey === 'string' && Boolean(env.INTERNAL_SERVICE_KEY) && internalKey === env.INTERNAL_SERVICE_KEY;

    const token = getBearerToken(request.headers.authorization);
    if (!isInternalCall && !token) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const authAgent = await prisma.agent.findUnique({
      where: { id: body.data.agent_id },
      select: {
        id: true,
        apiKeyHash: true,
        apiKeyPrefix: true,
        isActive: true
      }
    });

    if (!authAgent || !authAgent.isActive) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    if (!isInternalCall) {
      const safeToken = token as string;
      const apiKeyPrefix = safeToken.slice(0, PREFIX_LOOKUP_LENGTH);
      if (apiKeyPrefix !== authAgent.apiKeyPrefix) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const isValidApiKey = await verifyApiKey(safeToken, authAgent.apiKeyHash);
      if (!isValidApiKey) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
    }

    const start = Date.now();

    try {
      const evaluation = await evaluateIntent(body.data);
      const { riskIntentForExecution, ...response } = evaluation;
      const durationMs = Date.now() - start;

      app.log.info({
        evaluation_id: response.evaluation_id,
        agent_id: body.data.agent_id,
        result: response.result,
        policy_id: response.policy_id,
        duration_ms: durationMs,
        venue: body.data.venue,
        action_type: body.data.action_type
      }, 'Policy evaluation completed');

      setImmediate(async () => {
        try {
          const agent = await prisma.agent.findUnique({
            where: { id: body.data.agent_id },
            select: {
              id: true,
              erc8004TokenId: true,
            },
          });

          if (!agent?.erc8004TokenId) {
            return;
          }

          if (!canPostValidationOnChain()) {
            app.log.warn({ evaluation_id: response.evaluation_id }, 'ValidationRegistry not configured');
            return;
          }

          let executionState: ExecutionState = 'not-applicable';
          let executionNote = '';

          if (response.result === 'allow' && riskIntentForExecution) {
            try {
              const execution = await submitTradeIntent({
                intent: riskIntentForExecution,
                signature: response.eip712_signed_intent as `0x${string}`,
              });

              await prisma.intentEvaluation.update({
                where: { id: response.evaluation_id },
                data: {
                  validationTxHash: execution.txHash,
                },
              });

              executionState = 'confirmed';
              executionNote = ' execution_confirmed';
            } catch (executionError) {
              executionState = 'unconfirmed';
              executionNote = ` ${classifyExecutionError(executionError)}`;
              app.log.error({ err: executionError, evaluation_id: response.evaluation_id }, 'RiskRouter execution failed');
              captureError(executionError, {
                evaluation_id: response.evaluation_id,
                function: 'RiskRouter.submitTradeIntent',
                agent_token_id: agent.erc8004TokenId,
              });
            }
          }

          const validation = await postValidationRecord({
            agentId: BigInt(agent.erc8004TokenId),
            evaluationId: response.evaluation_id,
            score: resolveAttestationScore({
              result: response.result,
              reason: response.reason,
              executionState,
            }),
            notes:
              response.result === 'allow'
                ? `Policy evaluation allow; ${executionState === 'confirmed' ? 'execution confirmed on-chain' : 'execution pending/unconfirmed'};${executionNote}`
                : `Policy block: ${response.reason ?? 'blocked by policy'}`,
            checkpointData: {
              action_type: body.data.action_type,
              venue: body.data.venue,
              amount: body.data.amount,
              timestamp: Math.floor(Date.now() / 1_000),
            },
          });

          await persistValidationEmission({
            evaluationId: response.evaluation_id,
            agentTokenId: agent.erc8004TokenId,
            validation,
          });

          if (!canEmitReputationSignalOnChain()) {
            app.log.warn({ evaluation_id: response.evaluation_id }, 'ReputationRegistry not configured');
            return;
          }

          const alreadyEmittedSignal = await prisma.reputationSignal.findFirst({
            where: {
              cycleId: response.evaluation_id,
            },
            select: { id: true },
          });

          if (alreadyEmittedSignal) {
            return;
          }

          const feedback = resolveFeedback({
            result: response.result,
            reason: response.reason,
            executionState,
          });

          await emitReputationWithRetry({
            agentId: body.data.agent_id,
            agentTokenId: agent.erc8004TokenId,
            evaluationId: response.evaluation_id,
            feedback,
            app,
          });
        } catch (err) {
          app.log.error({ err, evaluation_id: response.evaluation_id }, 'Background on-chain emission failed');
          captureError(err, {
            evaluation_id: response.evaluation_id,
            function: 'evaluateRoutes.backgroundEmission',
          });
        }
      });

      return reply.status(200).send(response);
    } catch (error: any) {
      const evaluationServiceErrorLike = isEvaluationServiceErrorLike(error);
      app.log.error(
        { 
          isEvaluationServiceError: evaluationServiceErrorLike, 
          name: error?.name, 
          message: error?.message, 
          err: error 
        }, 
        'Caught error in evaluate route'
      );
      if (evaluationServiceErrorLike) {
        return reply.status(error.statusCode || 400).send({ error: error.message, evaluation_id: null });
      }

      request.log.error({ err: error }, 'Policy evaluation failed unexpectedly');
      return reply.status(500).send({ error: 'Internal evaluation error', evaluation_id: null });
    }
  });
}
