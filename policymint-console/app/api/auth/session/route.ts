import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();

  if (session.siwe?.address) {
    return NextResponse.json({
      address: session.siwe.address,
      chainId: session.siwe.chainId,
    });
  }

  return NextResponse.json({ address: null });
}
