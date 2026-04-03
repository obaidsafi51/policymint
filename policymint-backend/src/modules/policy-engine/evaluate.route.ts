import type { FastifyInstance } from 'fastify';
import { prisma } from '../../db/client';
import { verifyApiKey } from '../../lib/crypto';
import { EvaluateIntentSchema } from './evaluate.schema';
import { evaluateIntent, EvaluationServiceError } from './evaluate.service';

const API_KEY_PREFIX = 'pm_live_';
const PREFIX_LOOKUP_LENGTH = API_KEY_PREFIX.length + 8;

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
  app.post('/evaluate', async (request, reply) => {
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
      const response = await evaluateIntent(body.data);
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

      return reply.status(200).send(response);
    } catch (error) {
      if (error instanceof EvaluationServiceError && error.statusCode === 404) {
        return reply.status(404).send({ error: error.message, evaluation_id: null });
      }

      request.log.error({ err: error }, 'Policy evaluation failed unexpectedly');
      return reply.status(500).send({ error: 'Internal evaluation error', evaluation_id: null });
    }
  });
}
