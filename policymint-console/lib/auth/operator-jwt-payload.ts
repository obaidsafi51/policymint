export interface OperatorJwtPayload {
  operator_wallet: string;
  agent_ids: string[];
  iat: number;
  exp: number;
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
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
