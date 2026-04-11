import { FastifyInstance } from 'fastify';
import { getKrakenCliReadiness } from '../../exchange/kraken-readiness.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/', async (_request, reply) => {
    return reply.code(200).send({
      status: 'ok',
      service: 'policymint-api',
      version: process.env.npm_package_version ?? '0.0.1',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? 'production',
    });
  });

  app.get('/health', async (_request, reply) => {
    const krakenReadiness = getKrakenCliReadiness();

    return reply.code(200).send({
      status: 'healthy',
      uptime: Math.floor(process.uptime()),
      kraken_cli_ready: krakenReadiness.ready,
      kraken_cli_checked_at: krakenReadiness.checkedAt,
      kraken_cli_reason: krakenReadiness.reason,
    });
  });
}
