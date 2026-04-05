import cors from '@fastify/cors';
import { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';

export async function registerCors(app: FastifyInstance) {
  await app.register(cors, {
    origin: env.NODE_ENV === 'production' ? ['https://policymint.vercel.app'] : true,
    credentials: true,
  });
}
