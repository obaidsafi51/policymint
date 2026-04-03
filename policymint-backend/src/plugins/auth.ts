import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../db/client';
import { verifyApiKey } from '../lib/crypto';

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

export async function apiKeyAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = getBearerToken(request.headers.authorization);
  if (!token) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const apiKeyPrefix = token.slice(0, PREFIX_LOOKUP_LENGTH);

  const agent = await prisma.agent.findFirst({
    where: {
      apiKeyPrefix,
      isActive: true
    }
  });

  if (!agent) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const isValid = await verifyApiKey(token, agent.apiKeyHash);
  if (!isValid) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  request.agent = agent;
}
