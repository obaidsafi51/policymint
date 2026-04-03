import type { Agent } from '@prisma/client';

declare module 'fastify' {
	interface FastifyRequest {
		agent?: Agent;
	}
}

export {};
