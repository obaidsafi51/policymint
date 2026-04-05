import type { FastifyInstance } from 'fastify';
import { RegistryType, SignalType } from '@prisma/client';
import { keccak256, toHex } from 'viem';
import { prisma } from '../../db/client.js';
import { verifyApiKey } from '../../lib/crypto.js';
import { env } from '../../config/env.js';
import { EvaluateIntentSchema } from './evaluate.schema.js';
import { evaluateIntent, EvaluationServiceError } from './evaluate.service.js';
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
        feedbackType: FeedbackType.TRADE_EXECUTION,
        comment: 'Trade executed within policy bounds',
        signalType: SignalType.POSITIVE,
      };
    }

    return {
      score: 50,
      feedbackType: FeedbackType.TRADE_EXECUTION,
      comment: 'Trade allowed but execution failed or remained unconfirmed',
      signalType: SignalType.POSITIVE,
    };
  }

  const reason = input.reason ?? 'blocked by policy';
  const normalized = reason.toLowerCase();
  if (normalized.includes('riskrouter') || normalized.includes('hard limit')) {
    return {
      score: 10,
      feedbackType: FeedbackType.RISK_MANAGEMENT,
      comment: `Trade blocked: RiskRouter hard limit exceeded (${reason})`,
      signalType: SignalType.NEGATIVE,
    };
  }

  return {
    score: 20,
    feedbackType: FeedbackType.RISK_MANAGEMENT,
    comment: `Trade blocked: ${reason}`,
    signalType: SignalType.NEGATIVE,
  };
}

function toOutcomeRef(evaluationId: string): `0x${string}` {
  return keccak256(toHex(evaluationId));
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

    const token = getBearerToken(request.headers.authorization);
    if (!token) {
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

    const apiKeyPrefix = token.slice(0, PREFIX_LOOKUP_LENGTH);
    if (apiKeyPrefix !== authAgent.apiKeyPrefix) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const isValidApiKey = await verifyApiKey(token, authAgent.apiKeyHash);
    if (!isValidApiKey) {
      return reply.status(401).send({ error: 'Unauthorized' });
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

              executionState = 'confirmed';
              executionNote = ` Execution tx: ${execution.txHash}`;
            } catch (executionError) {
              executionState = 'unconfirmed';
              executionNote = ` Execution unconfirmed/reverted: ${executionError instanceof Error ? executionError.message : 'unknown error'}`;
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
                ? `Policy evaluation allow; ${executionState === 'confirmed' ? 'execution confirmed on-chain' : 'execution pending/unconfirmed'}.${executionNote}`
                : `Policy block: ${response.reason ?? 'blocked by policy'}`,
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

            const existingValidationRecord = await tx.validationRecord.findFirst({
              where: {
                evaluationId: response.evaluation_id,
                registryType: RegistryType.ERC8004,
              },
              select: { id: true },
            });

            if (existingValidationRecord) {
              await tx.validationRecord.update({
                where: { id: existingValidationRecord.id },
                data: {
                  txHash: validation.txHash,
                  blockNumber: validation.blockNumber,
                  outcomeRef: toOutcomeRef(response.evaluation_id),
                  strategyCheckpointHash: validation.checkpointHash,
                  emittedAt: new Date(),
                  confirmedAt: new Date(),
                  agentTokenId: agent.erc8004TokenId,
                },
              } as never);
            } else {
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
            }
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

          const reputationTxHash = await emitReputationSignal({
            agentId: BigInt(agent.erc8004TokenId),
            score: feedback.score,
            feedbackType: feedback.feedbackType,
            outcomeRef: toOutcomeRef(response.evaluation_id),
            comment: feedback.comment,
          });

          await prisma.reputationSignal.create({
            data: {
              agentId: body.data.agent_id,
              signalType: feedback.signalType,
              cycleId: response.evaluation_id,
              txHash: reputationTxHash,
              scoreSnapshot: feedback.score,
              emittedAt: new Date(),
            },
          });
        } catch (err) {
          app.log.error({ err, evaluation_id: response.evaluation_id }, 'Background on-chain emission failed');
        }
      });

      return reply.status(200).send(response);
    } catch (error) {
      if (error instanceof EvaluationServiceError) {
        return reply.status(error.statusCode).send({ error: error.message, evaluation_id: null });
      }

      request.log.error({ err: error }, 'Policy evaluation failed unexpectedly');
      return reply.status(500).send({ error: 'Internal evaluation error', evaluation_id: null });
    }
  });
}
