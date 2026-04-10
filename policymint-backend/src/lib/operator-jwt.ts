import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

const JWT_ALGORITHM = 'HS256';

export interface OperatorJwtPayload {
  operator_wallet: string;
  agent_ids: string[];
  iat: number;
  exp: number;
}

type VerifyResult =
  | { ok: true; payload: OperatorJwtPayload }
  | { ok: false; code: 'TOKEN_INVALID' | 'TOKEN_EXPIRED' };

type DecodedToken = {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  signedValue: string;
};

function toBase64Url(input: string | Buffer): string {
  const source = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return source.toString('base64url');
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function decodeToken(token: string): DecodedToken | null {
  const [headerPart, payloadPart, signature] = token.split('.');
  if (!headerPart || !payloadPart || !signature) return null;

  try {
    const header = JSON.parse(fromBase64Url(headerPart)) as Record<string, unknown>;
    const payload = JSON.parse(fromBase64Url(payloadPart)) as Record<string, unknown>;

    return {
      header,
      payload,
      signature,
      signedValue: `${headerPart}.${payloadPart}`,
    };
  } catch {
    return null;
  }
}

function asOperatorPayload(value: Record<string, unknown>): OperatorJwtPayload | null {
  const operatorWallet = value.operator_wallet;
  const agentIds = value.agent_ids;
  const iat = value.iat;
  const exp = value.exp;

  if (typeof operatorWallet !== 'string') return null;
  if (!Array.isArray(agentIds) || agentIds.some((entry) => typeof entry !== 'string')) return null;
  if (typeof iat !== 'number' || !Number.isFinite(iat)) return null;
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return null;

  return {
    operator_wallet: operatorWallet,
    agent_ids: agentIds,
    iat,
    exp,
  };
}

export function createOperatorJwt(input: { operatorWallet: string; agentIds: string[]; ttlSeconds: number }): {
  token: string;
  payload: OperatorJwtPayload;
} {
  const now = Math.floor(Date.now() / 1000);
  const payload: OperatorJwtPayload = {
    operator_wallet: input.operatorWallet,
    agent_ids: input.agentIds,
    iat: now,
    exp: now + input.ttlSeconds,
  };

  const header = {
    alg: JWT_ALGORITHM,
    typ: 'JWT',
  };

  const headerPart = toBase64Url(JSON.stringify(header));
  const payloadPart = toBase64Url(JSON.stringify(payload));
  const signedValue = `${headerPart}.${payloadPart}`;
  const signature = sign(signedValue, env.JWT_SECRET);

  return {
    token: `${signedValue}.${signature}`,
    payload,
  };
}

export function verifyOperatorJwt(token: string, options?: { allowExpired?: boolean }): VerifyResult {
  const decoded = decodeToken(token);
  if (!decoded) {
    return { ok: false, code: 'TOKEN_INVALID' };
  }

  if (decoded.header.alg !== JWT_ALGORITHM || decoded.header.typ !== 'JWT') {
    return { ok: false, code: 'TOKEN_INVALID' };
  }

  const expectedSignature = sign(decoded.signedValue, env.JWT_SECRET);

  const signatureBuffer = Buffer.from(decoded.signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  if (signatureBuffer.length !== expectedBuffer.length) {
    return { ok: false, code: 'TOKEN_INVALID' };
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return { ok: false, code: 'TOKEN_INVALID' };
  }

  const payload = asOperatorPayload(decoded.payload);
  if (!payload) {
    return { ok: false, code: 'TOKEN_INVALID' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (!options?.allowExpired && payload.exp <= now) {
    return { ok: false, code: 'TOKEN_EXPIRED' };
  }

  return { ok: true, payload };
}