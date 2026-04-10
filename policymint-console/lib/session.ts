import 'server-only';

import { getIronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '@/lib/auth/constants';

export interface SessionData {
  nonce?: string;
  siwe?: {
    address: string;
    chainId: number;
  };
}

function getSessionPassword() {
  const password = process.env.IRON_SESSION_PASSWORD ?? process.env.NEXTAUTH_SECRET;

  if (!password || password.length < 32) {
    throw new Error('IRON_SESSION_PASSWORD (or NEXTAUTH_SECRET) must be set and at least 32 characters');
  }

  return password;
}

export const sessionOptions: SessionOptions = {
  cookieName: SESSION_COOKIE_NAME,
  password: getSessionPassword(),
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 86400,
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
