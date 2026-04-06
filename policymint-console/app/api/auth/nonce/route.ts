import { generateNonce } from 'siwe';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  const nonce = generateNonce();

  session.nonce = nonce;
  await session.save();

  return new Response(nonce, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
