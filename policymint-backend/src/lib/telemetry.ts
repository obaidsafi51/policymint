import { randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from './logger.js';

type CaptureErrorInput = {
  error: unknown;
  context?: Record<string, unknown>;
  tags?: Record<string, string>;
};

function buildEventId(): string {
  return randomBytes(16).toString('hex');
}

function toErrorPayload(error: unknown): { type: string; value: string; stacktrace?: { frames: Array<{ filename?: string; function?: string; lineno?: number; colno?: number }> } } {
  if (error instanceof Error) {
    const frames = (error.stack ?? '')
      .split('\n')
      .slice(1)
      .map(line => line.trim())
      .filter(Boolean)
      .map(frame => ({ function: frame }));

    return {
      type: error.name || 'Error',
      value: error.message,
      ...(frames.length > 0 ? { stacktrace: { frames } } : {}),
    };
  }

  return {
    type: 'UnknownError',
    value: typeof error === 'string' ? error : JSON.stringify(error),
  };
}

function getSentryStoreEndpoint(): { url: string; key: string } | null {
  if (!env.SENTRY_DSN) {
    return null;
  }

  try {
    const dsn = new URL(env.SENTRY_DSN);
    const projectId = dsn.pathname.replace(/^\//, '');
    if (!projectId || !dsn.username) {
      return null;
    }

    const url = `${dsn.protocol}//${dsn.host}/api/${projectId}/store/?sentry_version=7&sentry_key=${encodeURIComponent(dsn.username)}`;
    return { url, key: dsn.username };
  } catch {
    return null;
  }
}

export async function captureErrorToSentry(input: CaptureErrorInput): Promise<void> {
  const endpoint = getSentryStoreEndpoint();
  if (!endpoint) {
    return;
  }

  const payload = {
    event_id: buildEventId(),
    platform: 'node',
    level: 'error',
    logger: 'policymint-backend',
    timestamp: new Date().toISOString(),
    tags: input.tags ?? {},
    extra: input.context ?? {},
    exception: {
      values: [toErrorPayload(input.error)],
    },
  };

  try {
    await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (sentryError) {
    logger.debug({ err: sentryError }, 'Sentry capture failed; continuing without telemetry');
  }
}
