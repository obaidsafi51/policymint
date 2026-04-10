import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { logger } from './lib/logger.js';
import { env } from './config/env.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { agentRoutes, agentProtectedRoutes } from './modules/agents/agent.routes.js';
import { policyRoutes } from './modules/policies/policy.routes.js';
import { evaluateRoutes } from './modules/policy-engine/evaluate.route.js';
import { evaluationTxHashRoutes } from './modules/policy-engine/evaluation-tx-hash.route.js';
import { apiKeyAuth } from './plugins/auth.js';
import { operatorJwtAuth } from './plugins/operator-auth.js';
import { consoleRoutes } from './modules/console/console.routes.js';
import { operatorAuthRoutes } from './modules/auth/operator-auth.routes.js';

export async function buildApp() {
  const app = Fastify({
    loggerInstance: logger,
    ajv: {
      customOptions: {
        removeAdditional: true,
        coerceTypes: false,
        allErrors: true,
      },
    },
  });

  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production',
  });

  await app.register(cors, {
    origin: env.NODE_ENV === 'production' ? ['https://policymint.vercel.app'] : true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Operator-Token'],
  });

  await app.register(rateLimit, {
    // TODO(production): Replace default in-memory store with Redis store
    // using @fastify/rate-limit redis option to survive service restarts.
    // Required before multi-instance deployment.
    global: false,
  });

  await app.register(sensible);

  app.setErrorHandler((error, request, reply) => {
    app.log.error({ err: error, url: request.url }, 'Unhandled error');

    if ((error as { validation?: unknown }).validation) {
      return reply.status(422).send({
        error: 'Validation Error',
        details: (error as { validation: unknown }).validation,
      });
    }

    const typedError = error instanceof Error ? error : new Error('Unknown error');
    const statusCode =
      typeof (error as { statusCode?: unknown }).statusCode === 'number'
        ? (error as { statusCode: number }).statusCode
        : 500;

    return reply.status(statusCode).send({
      error: statusCode >= 500 ? 'Internal Server Error' : typedError.message,
      ...(env.NODE_ENV !== 'production' && { stack: typedError.stack }),
    });
  });

  await app.register(healthRoutes);
  await app.register(operatorAuthRoutes, { prefix: '/auth' });
  await app.register(agentRoutes, { prefix: '/v1/agents' });
  await app.register(evaluateRoutes, { prefix: '/v1' });
  await app.register(evaluationTxHashRoutes, { prefix: '/v1' });
  await app.register(async (apiKeyProtectedApp) => {
    apiKeyProtectedApp.addHook('preHandler', apiKeyAuth);
    await apiKeyProtectedApp.register(agentProtectedRoutes, { prefix: '/v1/agents' });
    await apiKeyProtectedApp.register(policyRoutes, { prefix: '/v1/policies' });
  });

  await app.register(async (operatorProtectedApp) => {
    operatorProtectedApp.addHook('preHandler', operatorJwtAuth);
    await operatorProtectedApp.register(consoleRoutes, { prefix: '/v1/agents' });
  });

  return app;
}
