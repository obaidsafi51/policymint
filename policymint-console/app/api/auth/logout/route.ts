import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

async function clearSession() {
  const session = await getSession();
  session.nonce = undefined;
  session.siwe = undefined;
  await session.destroy();

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  return clearSession();
}

export async function POST() {
  return clearSession();
}
