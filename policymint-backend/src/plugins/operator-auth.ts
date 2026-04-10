import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyOperatorJwt } from '../lib/operator-jwt.js';

function sendAuthError(reply: FastifyReply, statusCode: number, code: string, message: string) {
  return reply.status(statusCode).send({
    success: false,
    error: {
      code,
      message,
    },
  });
}

export async function operatorJwtAuth(request: FastifyRequest, reply: FastifyReply) {
  const tokenHeader = request.headers['x-operator-token'];
  const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return sendAuthError(reply, 401, 'TOKEN_MISSING', 'Missing operator token');
  }

  const verification = verifyOperatorJwt(token.trim());
  if (!verification.ok) {
    if (verification.code === 'TOKEN_EXPIRED') {
      return sendAuthError(reply, 401, 'TOKEN_EXPIRED', 'Operator token has expired');
    }

    return sendAuthError(reply, 401, 'TOKEN_INVALID', 'Operator token is invalid');
  }

  request.operatorContext = {
    operatorWallet: verification.payload.operator_wallet,
    agentIds: verification.payload.agent_ids,
    expiresAt: verification.payload.exp,
  };
}