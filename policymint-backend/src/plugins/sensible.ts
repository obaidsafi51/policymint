import sensible from '@fastify/sensible';
import { FastifyInstance } from 'fastify';

export async function registerSensible(app: FastifyInstance) {
  await app.register(sensible);
}
