import { NextRequest, NextResponse } from 'next/server';
import { OPERATOR_SESSION_COOKIE_NAME } from '@/lib/auth/constants';
import { verifyOperatorJwt } from '@/lib/auth/operator-jwt';

const NO_BODY_METHODS = new Set(['GET', 'HEAD']);
const AUTH_PUBLIC_PATHS = new Set(['auth/nonce', 'auth/verify']);

function getBackendUrl() {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    throw new Error('BACKEND_URL is not configured');
  }

  return backendUrl.replace(/\/+$/, '');
}

function getJwtSecret() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwtSecret;
}

function buildForwardPath(pathSegments: string[] | undefined): string {
  if (!pathSegments || pathSegments.length === 0) {
    return '';
  }

  return pathSegments.map((segment) => encodeURIComponent(segment)).join('/');
}

function copySetCookie(source: Response, destination: NextResponse) {
  const getSetCookie = (source.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const setCookies = typeof getSetCookie === 'function'
    ? getSetCookie.call(source.headers)
    : (() => {
        const single = source.headers.get('set-cookie');
        return single ? [single] : [];
      })();

  if (setCookies.length === 0) {
    return;
  }

  for (const value of setCookies) {
    destination.headers.append('set-cookie', value);
  }
}

function unauthorized(code: string, message: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
      },
    },
    { status: 401 },
  );
}

async function tryRefreshSession(request: NextRequest, backendBaseUrl: string): Promise<{ token: string | null; response: Response | null }> {
  const cookieHeader = request.headers.get('cookie');

  const response = await fetch(`${backendBaseUrl}/auth/session`, {
    method: 'GET',
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    cache: 'no-store',
  });

  if (!response.ok) {
    return { token: null, response };
  }

  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) {
    return { token: null, response };
  }

  const tokenMatch = setCookie.match(new RegExp(`${OPERATOR_SESSION_COOKIE_NAME}=([^;]+)`));
  if (!tokenMatch?.[1]) {
    return { token: null, response };
  }

  return { token: decodeURIComponent(tokenMatch[1]), response };
}

async function handleProxy(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const backendBaseUrl = getBackendUrl();
  const jwtSecret = getJwtSecret();
  const { path } = await context.params;
  const proxyPath = buildForwardPath(path);
  const targetUrl = new URL(`${backendBaseUrl}/${proxyPath}`);

  targetUrl.search = request.nextUrl.search;

  const requiresSession = !AUTH_PUBLIC_PATHS.has(proxyPath);
  let operatorToken = request.cookies.get(OPERATOR_SESSION_COOKIE_NAME)?.value ?? null;
  let refreshedSessionResponse: Response | null = null;

  if (requiresSession) {
    if (!operatorToken) {
      return unauthorized('TOKEN_MISSING', 'Session cookie is missing');
    }

    const verification = verifyOperatorJwt(operatorToken, jwtSecret);
    if (!verification.ok && verification.code === 'TOKEN_EXPIRED') {
      const refreshed = await tryRefreshSession(request, backendBaseUrl);
      if (!refreshed.token || !refreshed.response?.ok) {
        return unauthorized('SESSION_EXPIRED', 'Session expired; please sign in again');
      }
      operatorToken = refreshed.token;
      refreshedSessionResponse = refreshed.response;
    }

    if (operatorToken) {
      const secondPass = verifyOperatorJwt(operatorToken, jwtSecret);
      if (!secondPass.ok) {
        return unauthorized(secondPass.code, 'Session token is invalid');
      }
    }
  }

  const outboundHeaders = new Headers(request.headers);
  outboundHeaders.delete('host');
  outboundHeaders.delete('content-length');

  if (operatorToken) {
    outboundHeaders.set('x-operator-token', operatorToken);
  }

  if (proxyPath === 'v1/evaluate' && !outboundHeaders.has('authorization')) {
    const agentApiKey = process.env.AGENT_API_KEY;
    if (agentApiKey) {
      outboundHeaders.set('authorization', `Bearer ${agentApiKey}`);
    }
  }

  const fetchInit: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers: outboundHeaders,
    body: NO_BODY_METHODS.has(request.method) ? undefined : request.body,
    cache: 'no-store',
  };

  if (!NO_BODY_METHODS.has(request.method)) {
    fetchInit.duplex = 'half';
  }

  const backendResponse = await fetch(targetUrl, fetchInit);

  const responseHeaders = new Headers();
  const contentType = backendResponse.headers.get('content-type');
  if (contentType) {
    responseHeaders.set('content-type', contentType);
  }

  const response = new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    headers: responseHeaders,
  });

  if (refreshedSessionResponse) {
    copySetCookie(refreshedSessionResponse, response);
  }
  copySetCookie(backendResponse, response);
  return response;
}

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handleProxy(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handleProxy(request, context);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handleProxy(request, context);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handleProxy(request, context);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handleProxy(request, context);
}