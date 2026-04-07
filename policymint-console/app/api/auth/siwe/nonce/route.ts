import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateNonce } from 'siwe';
import { readSession, sealSession, SESSION_COOKIE_NAME, getSessionCookieOptions } from '@/lib/auth/session';

export async function GET() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const existingSession = await readSession(existing);

  const nonce = generateNonce();
  const updatedSession = {
    ...existingSession,
    nonce,
    nonceIssuedAt: new Date().toISOString(),
  };

  const sealed = await sealSession(updatedSession);

  const response = NextResponse.json({ nonce });
  response.cookies.set(SESSION_COOKIE_NAME, sealed, getSessionCookieOptions());
  return response;
}
