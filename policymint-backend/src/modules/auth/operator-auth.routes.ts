import { randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { recoverMessageAddress } from 'viem';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { prisma } from '../../db/client.js';
import { createOperatorJwt, verifyOperatorJwt } from '../../lib/operator-jwt.js';

const OPERATOR_SESSION_COOKIE = 'policymint_operator_session';
const SIWE_NONCE_COOKIE = 'policymint_siwe_nonce';
const SESSION_TTL_SECONDS = 4 * 60 * 60;
const SESSION_GRACE_SECONDS = 60 * 60;
const SIWE_MAX_AGE_SECONDS = 5 * 60;

const VerifySchema = z.object({
  message: z.string().min(1),
  signature: z.string().min(1),
});

function sendAuthError(reply: FastifyReply, statusCode: number, code: string, message: string) {
  return reply.status(statusCode).send({
    success: false,
    error: {
      code,
      message,
    },
  });
}

function setCookie(reply: FastifyReply, name: string, value: string, maxAgeSeconds: number) {
  const attributes = [
    `${name}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAgeSeconds}`,
  ];

  if (env.NODE_ENV === 'production') {
    attributes.push('Secure');
  }

  const cookieValue = attributes.join('; ');
  const currentHeader = reply.getHeader('Set-Cookie');

  if (!currentHeader) {
    reply.header('Set-Cookie', cookieValue);
    return;
  }

  if (Array.isArray(currentHeader)) {
    reply.header('Set-Cookie', [...currentHeader, cookieValue]);
    return;
  }

  if (typeof currentHeader === 'string') {
    reply.header('Set-Cookie', [currentHeader, cookieValue]);
    return;
  }

  reply.header('Set-Cookie', cookieValue);
}

function clearCookie(reply: FastifyReply, name: string) {
  setCookie(reply, name, '', 0);
}

function readCookie(request: FastifyRequest, name: string): string | null {
  const header = request.headers.cookie;
  if (!header) return null;

  const pairs = header.split(';');
  for (const pair of pairs) {
    const [rawName, ...rawValue] = pair.trim().split('=');
    if (!rawName || rawValue.length === 0) continue;

    if (rawName === name) {
      return decodeURIComponent(rawValue.join('='));
    }
  }

  return null;
}

function parseSiweMessage(rawMessage: string): {
  address: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
} | null {
  const lines = rawMessage.split('\n');
  if (lines.length < 2) return null;

  const address = lines[1]?.trim();
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return null;
  }

  const chainIdMatch = rawMessage.match(/Chain ID:\s*(\d+)/i);
  const nonceMatch = rawMessage.match(/Nonce:\s*([^\n\r]+)/i);
  const issuedAtMatch = rawMessage.match(/Issued At:\s*([^\n\r]+)/i);

  if (!chainIdMatch?.[1] || !nonceMatch?.[1] || !issuedAtMatch?.[1]) {
    return null;
  }

  const chainId = Number(chainIdMatch[1]);
  if (!Number.isInteger(chainId)) return null;

  return {
    address,
    chainId,
    nonce: nonceMatch[1].trim(),
    issuedAt: issuedAtMatch[1].trim(),
  };
}

async function resolveAgentIdsForWallet(walletAddress: string): Promise<string[]> {
  const agents = await prisma.agent.findMany({
    where: {
      walletAddress: walletAddress.toLowerCase(),
      isActive: true,
    },
    select: {
      id: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return agents.map((agent) => agent.id);
}

function sessionEnvelope(payload: { operator_wallet: string; agent_ids: string[]; exp: number }) {
  return {
    success: true,
    operator_wallet: payload.operator_wallet,
    agent_ids: payload.agent_ids,
    expires_at: new Date(payload.exp * 1000).toISOString(),
  };
}

export async function operatorAuthRoutes(app: FastifyInstance) {
  app.get('/nonce', async (_request, reply) => {
    const nonce = randomBytes(16).toString('hex');
    setCookie(reply, SIWE_NONCE_COOKIE, encodeURIComponent(nonce), SIWE_MAX_AGE_SECONDS);
    return reply.type('text/plain').send(nonce);
  });

  app.post('/verify', async (request, reply) => {
    const body = VerifySchema.safeParse(request.body);
    if (!body.success) {
      return sendAuthError(reply, 422, 'SIWE_INVALID', 'message and signature are required');
    }

    const parsed = parseSiweMessage(body.data.message);
    if (!parsed) {
      return sendAuthError(reply, 401, 'SIWE_INVALID', 'SIWE message is invalid');
    }

    const nonceCookie = readCookie(request, SIWE_NONCE_COOKIE);
    if (!nonceCookie || nonceCookie !== parsed.nonce) {
      return sendAuthError(reply, 401, 'SIWE_NONCE_MISMATCH', 'Nonce does not match the issued nonce');
    }

    if (parsed.chainId !== env.CHAIN_ID) {
      return sendAuthError(reply, 401, 'SIWE_INVALID', 'Unexpected chain ID for SIWE message');
    }

    const issuedAt = new Date(parsed.issuedAt);
    if (Number.isNaN(issuedAt.getTime())) {
      return sendAuthError(reply, 401, 'SIWE_INVALID', 'SIWE issued timestamp is invalid');
    }

    const ageMs = Date.now() - issuedAt.getTime();
    if (ageMs < 0 || ageMs > SIWE_MAX_AGE_SECONDS * 1000) {
      return sendAuthError(reply, 401, 'SIWE_INVALID', 'SIWE message has expired');
    }

    try {
      const recovered = await recoverMessageAddress({
        message: body.data.message,
        signature: body.data.signature as `0x${string}`,
      });

      if (recovered.toLowerCase() !== parsed.address.toLowerCase()) {
        return sendAuthError(reply, 401, 'SIWE_INVALID', 'SIWE signature verification failed');
      }
    } catch {
      return sendAuthError(reply, 401, 'SIWE_INVALID', 'SIWE signature verification failed');
    }

    const operatorWallet = parsed.address.toLowerCase();
    const agentIds = await resolveAgentIdsForWallet(operatorWallet);

    const { token, payload } = createOperatorJwt({
      operatorWallet,
      agentIds,
      ttlSeconds: SESSION_TTL_SECONDS,
    });

    setCookie(reply, OPERATOR_SESSION_COOKIE, encodeURIComponent(token), SESSION_TTL_SECONDS);
    clearCookie(reply, SIWE_NONCE_COOKIE);

    return reply.send({
      success: true,
      operator_wallet: payload.operator_wallet,
      agent_ids: payload.agent_ids,
    });
  });

  app.get('/session', async (request, reply) => {
    const token = readCookie(request, OPERATOR_SESSION_COOKIE);
    if (!token) {
      return sendAuthError(reply, 401, 'TOKEN_MISSING', 'Session cookie is missing');
    }

    const verification = verifyOperatorJwt(token, { allowExpired: true });
    if (!verification.ok) {
      return sendAuthError(reply, 401, verification.code, 'Session token is invalid');
    }

    const now = Math.floor(Date.now() / 1000);
    if (verification.payload.exp > now) {
      return reply.send(sessionEnvelope(verification.payload));
    }

    const expiredBy = now - verification.payload.exp;
    if (expiredBy > SESSION_GRACE_SECONDS) {
      clearCookie(reply, OPERATOR_SESSION_COOKIE);
      return sendAuthError(reply, 401, 'TOKEN_EXPIRED', 'Session token has expired');
    }

    const refreshed = createOperatorJwt({
      operatorWallet: verification.payload.operator_wallet,
      agentIds: verification.payload.agent_ids,
      ttlSeconds: SESSION_TTL_SECONDS,
    });

    setCookie(reply, OPERATOR_SESSION_COOKIE, encodeURIComponent(refreshed.token), SESSION_TTL_SECONDS);
    return reply.send(sessionEnvelope(refreshed.payload));
  });

  app.post('/logout', async (_request, reply) => {
    clearCookie(reply, OPERATOR_SESSION_COOKIE);
    clearCookie(reply, SIWE_NONCE_COOKIE);

    return reply.send({
      success: true,
    });
  });
}