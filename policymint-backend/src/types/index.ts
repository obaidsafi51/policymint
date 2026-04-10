import type { Agent } from '@prisma/client';

declare module 'fastify' {
  interface FastifyRequest {
    agent?: Agent;
    operatorContext?: {
      operatorWallet: string;
      agentIds: string[];
      expiresAt: number;
    };
  }
}

export {};
