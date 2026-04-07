import { sealData, unsealData } from 'iron-session';

export interface PolicyMintSession {
  nonce?: string;
  nonceIssuedAt?: string;
  address?: string;
  chainId?: number;
  issuedAt?: string;
  expiresAt?: string;
}

export const SESSION_COOKIE_NAME = 'policymint_siwe_session';
export const SIWE_CHAIN_ID = 11155111;

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const NONCE_TTL_SECONDS = 60 * 10;

function getSessionPassword(): string {
  return (
    process.env.SIWE_SESSION_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    'replace-this-dev-secret-with-at-least-32-characters'
  );
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}

export async function sealSession(session: PolicyMintSession): Promise<string> {
  return sealData(session, {
    password: getSessionPassword(),
    ttl: SESSION_TTL_SECONDS,
  });
}

export async function readSession(rawCookieValue: string | undefined): Promise<PolicyMintSession | null> {
  if (!rawCookieValue) {
    return null;
  }

  try {
    const data = await unsealData<PolicyMintSession>(rawCookieValue, {
      password: getSessionPassword(),
      ttl: SESSION_TTL_SECONDS,
    });

    return data ?? null;
  } catch {
    return null;
  }
}

export function isNonceValid(session: PolicyMintSession): boolean {
  if (!session.nonce || !session.nonceIssuedAt) {
    return false;
  }

  const nonceAge = Date.now() - new Date(session.nonceIssuedAt).getTime();
  return nonceAge >= 0 && nonceAge <= NONCE_TTL_SECONDS * 1000;
}

export function isAuthenticatedSession(session: PolicyMintSession | null): session is PolicyMintSession {
  if (!session?.address || !session.expiresAt) {
    return false;
  }

  const expiresAt = new Date(session.expiresAt).getTime();
  return expiresAt > Date.now() && session.chainId === SIWE_CHAIN_ID;
}

export function createAuthenticatedSession(address: string): PolicyMintSession {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

  return {
    address,
    chainId: SIWE_CHAIN_ID,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}
