import { NextRequest, NextResponse } from 'next/server';
import { OPERATOR_SESSION_COOKIE_NAME } from '@/lib/auth/constants';
import { decodeOperatorJwt } from '@/lib/auth/operator-jwt';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(OPERATOR_SESSION_COOKIE_NAME)?.value;
  const isValidSession = Boolean(token);

  if (isValidSession && token) {
    const payload = decodeOperatorJwt(token);
    if (payload && payload.exp > Math.floor(Date.now() / 1000)) {
      return NextResponse.next();
    }
  }

  const response = NextResponse.redirect(new URL('/', request.url));
  if (token) {
    response.cookies.set(OPERATOR_SESSION_COOKIE_NAME, '', {
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
