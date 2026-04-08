import { env } from '../config/env.js';
import { logger } from './logger.js';

export function captureError(error: unknown, context: Record<string, unknown> = {}) {
  logger.error({ err: error, sentry: { dsnConfigured: Boolean(env.SENTRY_DSN), ...context } }, 'Captured error');
}
