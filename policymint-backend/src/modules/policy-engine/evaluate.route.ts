import type { FastifyInstance } from 'fastify';
import { RegistryType, SignalType } from '@prisma/client';
import { keccak256, toBytes } from 'viem';
import { prisma } from '../../db/client.js';
import { verifyApiKey } from '../../lib/crypto.js';
import { env } from '../../config/env.js';
import { EvaluateIntentSchema } from './evaluate.schema.js';
import { evaluateIntent } from './evaluate.service.js';
import { canPostValidationOnChain, postValidationRecord } from '../../lib/blockchain/validationRegistry.js';
import {
  AlreadyRatedError,
  canEmitReputationSignalOnChain,
  emitReputationSignal,
} from '../../lib/blockchain/reputationRegistry.js';
import { resolveReputationPayload, type EvaluationOutcome } from './reputation.mapper.js';
import { captureErrorToSentry } from '../../lib/telemetry.js';
import { executeTradeIntent, shouldSkipKrakenExecution, type TradeExecutionStatus } from './execution.router.js';

const API_KEY_PREFIX = 'pm_live_';
const PREFIX_LOOKUP_LENGTH = API_KEY_PREFIX.length + 8;
const RATE_LIMIT_TIME_WINDOW = env.NODE_ENV === 'test' ? '1 minute' : '1 second';
type ExecutionState = 'confirmed' | 'unconfirmed' | 'failed' | 'not-applicable';
type ExecutionErrorTag = 'execution_reverted' | 'execution_timeout' | 'rpc_error' | 'signing_error' | 'nonce_persist_failed';
const REPUTATION_MAX_RETRIES = 3;

function mapExecutionStatusToState(status: TradeExecutionStatus): ExecutionState {
  if (status === 'confirmed') return 'confirmed';
  if (status === 'pending' || status === 'timeout') return 'unconfirmed';
  if (status === 'failed' || status === 'rejected' || status === 'abandoned') return 'failed';
  return 'not-applicable';
}

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

function classifyExecutionError(error: unknown): ExecutionErrorTag {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('timeout') || message.includes('timed out') || message.includes('abort')) return 'execution_timeout';
  if (message.includes('sign') || message.includes('signature')) return 'signing_error';
  if (message.includes('rpc') || message.includes('http') || message.includes('network')) return 'rpc_error';
  if (message.includes('nonce') || message.includes('persist')) return 'nonce_persist_failed';

  return 'execution_reverted';
}

function resolveAttestationScore(input: {
  result: 'allow' | 'block';
  reason: string | null;
  executionState: ExecutionState;
  executionStatus: TradeExecutionStatus | undefined;
}): number {
  if (input.result === 'allow') {
    if (input.executionStatus === 'skipped') return 40;
    return input.executionState === 'confirmed' ? 95 : 70;
  }

  const reason = (input.reason ?? '').toLowerCase();
  if (reason.includes('malformed') || reason.includes('invalid')) return 20;
  return 40;
}

function resolveOutcome(input: {
  result: 'allow' | 'block';
  reason: string | null;
  executionState: ExecutionState;
  executionStatus: TradeExecutionStatus | undefined;
}): EvaluationOutcome | null {
  if (input.result === 'allow') {
    if (input.executionState === 'confirmed') return 'allow_confirmed';
    if (input.executionStatus === 'rejected') return 'allow_execution_rejected';
    if (input.executionState === 'failed') return 'allow_execution_failed';
    return null;
  }

  const normalizedReason = (input.reason ?? '').toLowerCase();
  if (normalizedReason.includes('riskrouter') || normalizedReason.includes('hard limit')) {
    return 'block_risk_router';
  }

  return 'block_policy_violation';
}

async function logReputationAttempt(input: {
  evaluationId: string;
  agentId: string;
  attempt: number;
  status: 'attempt' | 'success' | 'failed';
  txHash?: string;
  errorMessage?: string;
}) {
  await prisma.$executeRaw`
    INSERT INTO reputation_log (evaluation_id, agent_id, attempt, status, tx_hash, error_message)
    VALUES (
      ${input.evaluationId}::uuid,
      ${input.agentId}::uuid,
      ${input.attempt},
      ${input.status},
      ${input.txHash ?? null},
      ${input.errorMessage ?? null}
    )
  `;
}

function toOutcomeRef(evaluationId: string): `0x${string}` {
  return keccak256(toBytes(evaluationId));
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
  if (!authorizationHeader || Array.isArray(authorizationHeader)) return null;
  if (!authorizationHeader.startsWith('Bearer ')) return null;

  const token = authorizationHeader.slice('Bearer '.length).trim();
  if (!token.startsWith(API_KEY_PREFIX)) return null;

  return token;
}

function isEvaluationServiceErrorLike(
  error: unknown,
): error is { name?: string; message: string; statusCode: number } {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as { name?: unknown; message?: unknown; statusCode?: unknown };
  return candidate.name === 'EvaluationServiceError'
    && typeof candidate.message === 'string'
    && typeof candidate.statusCode === 'number';
}

export async function evaluateRoutes(app: FastifyInstance) {
  app.post('/evaluate', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: RATE_LIMIT_TIME_WINDOW,
        keyGenerator: request => {
          const auth = request.headers.authorization;
          if (typeof auth === 'string' && auth.length > 0) return auth;
          if (Array.isArray(auth) && typeof auth[0] === 'string' && auth[0].length > 0) return auth[0];
          return request.ip;
        },
        errorResponseBuilder: (_request, context) => ({
          statusCode: 429,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Max ${context.max} requests per second per authorization key.`,
        }),
      },
    },
  }, async (request, reply) => {
    const body = EvaluateIntentSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.flatten() });
    }

    const internalKey = request.headers['x-internal-key'];
    const isInternalCall =
      typeof internalKey === 'string'
      && Boolean(env.INTERNAL_SERVICE_KEY)
      && internalKey === env.INTERNAL_SERVICE_KEY;

    const token = getBearerToken(request.headers.authorization);
    if (!isInternalCall && !token) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const authAgent = await prisma.agent.findUnique({
      where: { id: body.data.agent_id },
      select: { id: true, apiKeyHash: true, apiKeyPrefix: true, isActive: true },
    });

    if (!authAgent || !authAgent.isActive) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    if (!isInternalCall) {
      const safeToken = token as string;
      const apiKeyPrefix = safeToken.slice(0, PREFIX_LOOKUP_LENGTH);
      if (apiKeyPrefix !== authAgent.apiKeyPrefix) return reply.status(401).send({ error: 'Unauthorized' });

      const isValidApiKey = await verifyApiKey(safeToken, authAgent.apiKeyHash);
      if (!isValidApiKey) return reply.status(401).send({ error: 'Unauthorized' });
    }

    const start = Date.now();

    try {
      const evaluation = await evaluateIntent(body.data);
      const { riskIntentForExecution, ...response } = evaluation;
      const durationMs = Date.now() - start;

      app.log.info(
        {
          evaluation_id: response.evaluation_id,
          agent_id: body.data.agent_id,
          result: response.result,
          policy_id: response.policy_id,
          duration_ms: durationMs,
          venue: body.data.venue,
          action_type: body.data.action_type,
        },
        'Policy evaluation completed',
      );

      setImmediate(async () => {
        try {
          const agent = await prisma.agent.findUnique({
            where: { id: body.data.agent_id },
            select: { id: true, erc8004TokenId: true },
          });

          if (!agent?.erc8004TokenId) return;
          if (!canPostValidationOnChain()) {
            app.log.warn({ evaluation_id: response.evaluation_id }, 'ValidationRegistry not configured');
            return;
          }

          let executionState: ExecutionState = 'not-applicable';
          let executionStatus: TradeExecutionStatus | undefined;

          if (response.result === 'allow' && riskIntentForExecution) {
            try {
              const skippedKraken = shouldSkipKrakenExecution(body.data.venue);

              if (!skippedKraken) {
                const pendingValidation = await postValidationRecord({
                  agentId: BigInt(agent.erc8004TokenId),
                  evaluationId: response.evaluation_id,
                  score: resolveAttestationScore({
                    result: response.result,
                    reason: response.reason,
                    executionState: 'unconfirmed',
                    executionStatus: undefined,
                  }),
                  notes: 'Policy evaluation allow; execution submitted/unconfirmed',
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
                  validation: pendingValidation,
                });
              }

              const execution = await executeTradeIntent({
                agentId: body.data.agent_id,
                evaluationId: response.evaluation_id,
                venue: body.data.venue,
                riskIntent: riskIntentForExecution,
                signedIntent: response.eip712_signed_intent as `0x${string}`,
              });

              executionStatus = execution.status;
              executionState = mapExecutionStatusToState(execution.status);

              if (execution.executionPath === 'risk_router' && execution.executionReference?.startsWith('0x')) {
                await prisma.intentEvaluation.update({
                  where: { id: response.evaluation_id },
                  data: {
                    cycleId: execution.executionReference,
                  },
                });
              }

              if (execution.status === 'confirmed') {
                const confirmedValidation = await postValidationRecord({
                  agentId: BigInt(agent.erc8004TokenId),
                  evaluationId: response.evaluation_id,
                  score: resolveAttestationScore({
                    result: response.result,
                    reason: response.reason,
                    executionState,
                    executionStatus,
                  }),
                  notes: 'Policy evaluation allow; execution confirmed',
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
                  validation: confirmedValidation,
                });
              } else if (execution.status === 'skipped') {
                const skippedValidation = await postValidationRecord({
                  agentId: BigInt(agent.erc8004TokenId),
                  evaluationId: response.evaluation_id,
                  score: resolveAttestationScore({
                    result: response.result,
                    reason: execution.reason,
                    executionState,
                    executionStatus,
                  }),
                  notes: execution.reason ?? 'Policy evaluation allow; execution skipped',
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
                  validation: skippedValidation,
                });
              }

              if (execution.status !== 'confirmed') {
                app.log.warn(
                  {
                    evaluation_id: response.evaluation_id,
                    execution_status: execution.status,
                    execution_reason: execution.reason,
                    execution_error_code: execution.errorCode,
                  },
                  'Execution did not confirm',
                );
              }
            } catch (executionError) {
              executionState = 'failed';
              executionStatus = 'failed';
              app.log.error({ err: executionError, evaluation_id: response.evaluation_id }, 'Execution router failed');
              await captureErrorToSentry({
                error: executionError,
                tags: { stage: 'execution_router' },
                context: {
                  evaluation_id: response.evaluation_id,
                  agent_id: body.data.agent_id,
                  execution_error: classifyExecutionError(executionError),
                },
              });
            }
          } else if (response.result === 'allow') {
            const validation = await postValidationRecord({
              agentId: BigInt(agent.erc8004TokenId),
              evaluationId: response.evaluation_id,
              score: resolveAttestationScore({
                result: response.result,
                reason: response.reason,
                executionState,
                executionStatus,
              }),
              notes: 'Policy evaluation allow; no on-chain RiskRouter execution for this action type',
              checkpointData: {
                action_type: body.data.action_type,
                venue: body.data.venue,
                amount: body.data.amount,
                timestamp: Math.floor(Date.now() / 1_000),
              },
            });

            await prisma.$transaction(async tx => {
              await tx.intentEvaluation.update({
                where: { id: response.evaluation_id },
                data: {
                  validationTxHash: validation.txHash,
                  emittedAt: new Date(),
                },
              });

              await tx.validationRecord.create({
                data: {
                  evaluationId: response.evaluation_id,
                  registryType: RegistryType.ERC8004,
                  txHash: validation.txHash,
                  blockNumber: validation.blockNumber,
                  outcomeRef: toOutcomeRef(response.evaluation_id),
                  strategyCheckpointHash: validation.checkpointHash,
                  emittedAt: new Date(),
                  confirmedAt: new Date(),
                  agentTokenId: agent.erc8004TokenId,
                },
              } as never);
            });
          } else {
            const validation = await postValidationRecord({
              agentId: BigInt(agent.erc8004TokenId),
              evaluationId: response.evaluation_id,
              score: resolveAttestationScore({
                result: response.result,
                reason: response.reason,
                executionState,
                executionStatus,
              }),
              notes: `Policy block: ${response.reason ?? 'blocked by policy'}`,
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
          }

          if (!canEmitReputationSignalOnChain()) {
            app.log.warn({ evaluation_id: response.evaluation_id }, 'ReputationRegistry not configured');
            return;
          }

          const alreadyEmittedSignal = await prisma.reputationSignal.findFirst({
            where: { cycleId: response.evaluation_id },
            select: { id: true },
          });

          if (alreadyEmittedSignal) return;

          const outcome = resolveOutcome({
            result: response.result,
            reason: response.reason,
            executionState,
            executionStatus,
          });

          if (!outcome) return;

          const feedback = resolveReputationPayload(outcome);
          const signalType = outcome.startsWith('allow') ? SignalType.POSITIVE : SignalType.NEGATIVE;

          let reputationTxHash: `0x${string}` | null = null;
          let reputationFailureMessage: string | null = null;

          for (let attempt = 1; attempt <= REPUTATION_MAX_RETRIES; attempt += 1) {
            try {
              await logReputationAttempt({
                evaluationId: response.evaluation_id,
                agentId: body.data.agent_id,
                attempt,
                status: 'attempt',
              });

              reputationTxHash = await emitReputationSignal({
                agentId: BigInt(agent.erc8004TokenId),
                score: feedback.score,
                feedbackType: feedback.feedbackType,
                outcomeRef: toOutcomeRef(response.evaluation_id),
                comment: feedback.comment,
              });

              await prisma.reputationSignal.upsert({
                where: { cycleId: response.evaluation_id },
                update: {
                  txHash: reputationTxHash,
                  scoreSnapshot: feedback.score,
                  signalType,
                  emittedAt: new Date(),
                },
                create: {
                  agentId: body.data.agent_id,
                  signalType,
                  cycleId: response.evaluation_id,
                  txHash: reputationTxHash,
                  scoreSnapshot: feedback.score,
                  emittedAt: new Date(),
                },
              });

              await logReputationAttempt({
                evaluationId: response.evaluation_id,
                agentId: body.data.agent_id,
                attempt,
                status: 'success',
                txHash: reputationTxHash,
              });

              break;
            } catch (reputationErr) {
              const errorMessage = reputationErr instanceof Error ? reputationErr.message : 'Unknown reputation emission error';
              reputationFailureMessage = errorMessage;

              if (reputationErr instanceof AlreadyRatedError) {
                app.log.warn(
                  { evaluation_id: response.evaluation_id, error: errorMessage },
                  'submitFeedback skipped — hasRated() returned true',
                );

                await logReputationAttempt({
                  evaluationId: response.evaluation_id,
                  agentId: body.data.agent_id,
                  attempt,
                  status: 'success',
                });

                break;
              }

              await logReputationAttempt({
                evaluationId: response.evaluation_id,
                agentId: body.data.agent_id,
                attempt,
                status: 'failed',
                errorMessage,
              });

              if (attempt < REPUTATION_MAX_RETRIES) {
                await sleep(250 * 2 ** (attempt - 1));
              }
            }
          }

          if (!reputationTxHash) {
            app.log.error(
              { evaluation_id: response.evaluation_id, error: reputationFailureMessage },
              'Reputation emission failed after retries',
            );

            await captureErrorToSentry({
              error: reputationFailureMessage ?? 'Reputation emission failed after retries',
              tags: { stage: 'reputation_emission' },
              context: {
                evaluation_id: response.evaluation_id,
                agent_id: body.data.agent_id,
              },
            });
          }
        } catch (err) {
          app.log.error({ err, evaluation_id: response.evaluation_id }, 'Background on-chain emission failed');
          await captureErrorToSentry({
            error: err,
            tags: { stage: 'background_emission' },
            context: {
              evaluation_id: response.evaluation_id,
              agent_id: body.data.agent_id,
            },
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
          err: error,
        },
        'Caught error in evaluate route',
      );

      if (evaluationServiceErrorLike) {
        return reply.status(error.statusCode || 400).send({ error: error.message, evaluation_id: null });
      }

      request.log.error({ err: error }, 'Policy evaluation failed unexpectedly');

      await captureErrorToSentry({
        error,
        tags: { stage: 'evaluate_request' },
        context: {
          agent_id: body.data.agent_id,
        },
      });

      return reply.status(500).send({ error: 'Internal evaluation error', evaluation_id: null });
    }
  });
}