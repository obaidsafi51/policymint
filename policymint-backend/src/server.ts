import { buildApp } from './app';
import { env } from './config/env';
import { prisma } from './db/client';

async function main() {
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}. Shutting down gracefully.`);
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  try {
    await app.listen({ 
      port: Number(process.env.PORT) || 3000, 
      host: '0.0.0.0' 
    });
    app.log.info(`PolicyMint backend running on port ${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

void main();
