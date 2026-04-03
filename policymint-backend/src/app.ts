import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { logger } from './lib/logger';
import { env } from './config/env';
import { healthRoutes } from './modules/health/health.routes';
import { agentRoutes, agentProtectedRoutes } from './modules/agents/agent.routes';
import { policyRoutes } from './modules/policies/policy.routes';
import { apiKeyAuth } from './plugins/auth';

export async function buildApp() {
  const app = Fastify({
    loggerInstance: logger,
    ajv: {
      customOptions: {
        removeAdditional: true,
        coerceTypes: false,
        allErrors: true
      }
    }
  });

  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production'
  });

  await app.register(cors, {
    origin: env.NODE_ENV === 'production' ? ['https://policymint.vercel.app'] : true,
    credentials: true
  });

  await app.register(sensible);

  app.setErrorHandler((error, request, reply) => {
    app.log.error({ err: error, url: request.url }, 'Unhandled error');

    if ((error as { validation?: unknown }).validation) {
      return reply.status(422).send({
        error: 'Validation Error',
        details: (error as { validation: unknown }).validation
      });
    }

    const typedError = error instanceof Error ? error : new Error('Unknown error');
    const statusCode =
      typeof (error as { statusCode?: unknown }).statusCode === 'number'
        ? ((error as { statusCode: number }).statusCode)
        : 500;

    return reply.status(statusCode).send({
      error: statusCode >= 500 ? 'Internal Server Error' : typedError.message,
      ...(env.NODE_ENV !== 'production' && { stack: typedError.stack })
    });
  });

  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(agentRoutes, { prefix: '/v1/agents' });
  await app.register(async protectedApp => {
    protectedApp.addHook('preHandler', apiKeyAuth);
    await protectedApp.register(agentProtectedRoutes, { prefix: '/v1/agents' });
    await protectedApp.register(policyRoutes, { prefix: '/v1/policies' });
  });

  return app;
}
