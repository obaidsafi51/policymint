import { createHmac, timingSafeEqual } from 'node:crypto';

const JWT_ALGORITHM = 'HS256';

export interface OperatorJwtPayload {
  operator_wallet: string;
  agent_ids: string[];
  iat: number;
  exp: number;
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
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

export function decodeOperatorJwt(token: string): OperatorJwtPayload | null {
  const [, payloadPart] = token.split('.');
  if (!payloadPart) return null;

  try {
    const payload = JSON.parse(fromBase64Url(payloadPart)) as Record<string, unknown>;
    return asOperatorPayload(payload);
  } catch {
    return null;
  }
}

export function verifyOperatorJwt(token: string, secret: string, options?: { allowExpired?: boolean }): {
  ok: true;
  payload: OperatorJwtPayload;
} | {
  ok: false;
  code: 'TOKEN_INVALID' | 'TOKEN_EXPIRED';
} {
  const [headerPart, payloadPart, signature] = token.split('.');
  if (!headerPart || !payloadPart || !signature) {
    return { ok: false, code: 'TOKEN_INVALID' };
  }

  let header: Record<string, unknown>;
  try {
    header = JSON.parse(fromBase64Url(headerPart)) as Record<string, unknown>;
  } catch {
    return { ok: false, code: 'TOKEN_INVALID' };
  }

  if (header.alg !== JWT_ALGORITHM || header.typ !== 'JWT') {
    return { ok: false, code: 'TOKEN_INVALID' };
  }

  const signedValue = `${headerPart}.${payloadPart}`;
  const expectedSignature = sign(signedValue, secret);

  const signatureBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  if (signatureBuffer.length !== expectedBuffer.length) {
    return { ok: false, code: 'TOKEN_INVALID' };
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return { ok: false, code: 'TOKEN_INVALID' };
  }

  const payload = decodeOperatorJwt(token);
  if (!payload) {
    return { ok: false, code: 'TOKEN_INVALID' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (!options?.allowExpired && payload.exp <= now) {
    return { ok: false, code: 'TOKEN_EXPIRED' };
  }

  return { ok: true, payload };
}