import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth/constants';

export async function middleware(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie');

  try {
    const sessionResponse = await fetch(new URL('/api/auth/session', request.url), {
      method: 'GET',
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    });

    if (sessionResponse.ok) {
      const session = (await sessionResponse.json()) as { address?: string | null };
      if (typeof session.address === 'string' && session.address.length > 0) {
        return NextResponse.next();
      }
    }
  } catch {
    // noop - treat as unauthenticated below
  }

  const response = NextResponse.redirect(new URL('/', request.url));
  if (request.cookies.get(SESSION_COOKIE_NAME)?.value) {
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/simulate/:path*'],
};
