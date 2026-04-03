import pino from 'pino';
import { env } from '../config/env';

export function createLogger(destination?: pino.DestinationStream) {
  return pino(
    {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      ...(env.NODE_ENV !== 'production' && !destination
        ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
        : {}),
      base: { service: 'policymint-backend', env: env.NODE_ENV }
    },
    destination
  );
}

export const logger = createLogger();
