import { NextRequest, NextResponse } from 'next/server';
import { SiweMessage } from 'siwe';
import { SIWE_CHAIN_ID } from '@/lib/auth/constants';
import { getSession } from '@/lib/session';

interface VerifyPayload {
  message: string;
  signature: string;
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as VerifyPayload | null;

  if (!payload?.message || !payload?.signature) {
    return new Response('message and signature are required', { status: 422 });
  }

  const session = await getSession();

  if (!session.nonce) {
    return new Response('missing nonce in session', { status: 422 });
  }

  try {
    const siwe = new SiweMessage(payload.message);
    const result = await siwe.verify({
      signature: payload.signature,
      nonce: session.nonce,
      domain: request.nextUrl.host,
    });

    if (result.data.chainId !== SIWE_CHAIN_ID) {
      return new Response('wrong chain id', { status: 401 });
    }

    session.siwe = {
      address: result.data.address,
      chainId: result.data.chainId,
    };
    session.nonce = undefined;
    await session.save();

    return NextResponse.json({ ok: true, address: result.data.address });
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : 'verification failed';
    return new Response(message, { status: 401 });
  }
}
