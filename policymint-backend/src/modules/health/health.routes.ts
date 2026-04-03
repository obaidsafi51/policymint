import { FastifyInstance } from 'fastify';
import { prisma } from '../../db/client';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.send({
        status: 'ok',
        db: 'connected',
        timestamp: new Date().toISOString()
      });
    } catch {
      return reply.status(503).send({ status: 'error', db: 'disconnected' });
    }
  });
}
