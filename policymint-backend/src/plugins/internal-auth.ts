import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';

export async function internalAuthHook(request: FastifyRequest, reply: FastifyReply) {
  if (!env.INTERNAL_SERVICE_KEY) {
    request.log.error('INTERNAL_SERVICE_KEY is not configured');
    return reply.status(503).send({
      error: 'INTERNAL_AUTH_NOT_CONFIGURED',
      message: 'Internal authentication is not configured on this service'
    });
  }

  const internalKey = request.headers['x-internal-key'];

  if (typeof internalKey !== 'string' || internalKey !== env.INTERNAL_SERVICE_KEY) {
    return reply.status(401).send({
      error: 'UNAUTHORIZED',
      message: 'Missing or invalid internal service key'
    });
  }
}
