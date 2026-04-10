export const API_URL = process.env.NEXT_PUBLIC_API_URL;
export const API_KEY = process.env.NEXT_PUBLIC_AGENT_API_KEY;

type ErrorEnvelope = {
  success: false;
  error?: {
    code?: string;
    message?: string;
  };
};

type SuccessEnvelope<T> = {
  success: true;
  data: T;
  meta: {
    agent_id: string;
    generated_at: string;
  };
};

type ApiEnvelope<T> = SuccessEnvelope<T> | ErrorEnvelope;

export class ConsoleApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function hasApiUrl(): boolean {
  return Boolean(API_URL);
}

export function buildApiUrl(path: string): string {
  if (!API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }
  return `${API_URL}${path}`;
}

export async function consoleApiRequest<T>(path: string, init?: RequestInit): Promise<SuccessEnvelope<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const headers = new Headers(init?.headers);
    headers.set('Accept', 'application/json');

    if (API_KEY && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${API_KEY}`);
    }

    const response = await fetch(buildApiUrl(path), {
      ...init,
      credentials: 'include',
      headers,
      signal: controller.signal,
    });

    let payload: ApiEnvelope<T> | null = null;

    try {
      payload = (await response.json()) as ApiEnvelope<T>;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const code = payload && !payload.success ? (payload.error?.code ?? 'HTTP_ERROR') : 'HTTP_ERROR';
      const message = payload && !payload.success ? (payload.error?.message ?? response.statusText) : response.statusText;
      throw new ConsoleApiError(message || 'Request failed', code, response.status);
    }

    if (!payload || !payload.success) {
      const code = payload && !payload.success ? (payload.error?.code ?? 'UNKNOWN_API_ERROR') : 'INVALID_RESPONSE';
      const message = payload && !payload.success ? (payload.error?.message ?? 'Request failed') : 'Invalid API response';
      throw new ConsoleApiError(message, code, response.status);
    }

    return payload;
  } catch (error) {
    if (error instanceof ConsoleApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ConsoleApiError('Request timed out', 'REQUEST_TIMEOUT', 408);
    }

    const message = error instanceof Error ? error.message : 'Unknown request error';
    throw new ConsoleApiError(message, 'REQUEST_FAILED', 500);
  } finally {
    clearTimeout(timeout);
  }
}
