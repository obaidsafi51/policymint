import { describe, expect, it, vi } from 'vitest';
import { createOperatorJwt, verifyOperatorJwt } from './operator-jwt.js';

vi.mock('../config/env', () => ({
  env: {
    JWT_SECRET: 'this-is-a-long-secret-with-32-characters-min',
  },
}));

describe('operator-jwt', () => {
  it('creates and verifies a valid token', () => {
    const { token, payload } = createOperatorJwt({
      operatorWallet: '0xabc',
      agentIds: ['agent-1', 'agent-2'],
      ttlSeconds: 60,
    });

    const result = verifyOperatorJwt(token);
    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.payload.operator_wallet).toBe(payload.operator_wallet);
      expect(result.payload.agent_ids).toEqual(payload.agent_ids);
      expect(result.payload.exp).toBeGreaterThan(result.payload.iat);
    }
  });

  it('rejects expired tokens', () => {
    const { token } = createOperatorJwt({
      operatorWallet: '0xabc',
      agentIds: ['agent-1'],
      ttlSeconds: -60,
    });

    const result = verifyOperatorJwt(token);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('TOKEN_EXPIRED');
    }
  });

  it('rejects tampered signatures', () => {
    const { token } = createOperatorJwt({
      operatorWallet: '0xabc',
      agentIds: ['agent-1'],
      ttlSeconds: 60,
    });

    const tampered = `${token.slice(0, -1)}x`;
    const result = verifyOperatorJwt(tampered);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('TOKEN_INVALID');
    }
  });
});
