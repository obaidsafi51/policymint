import { buildApp } from './app.js';
import { StrategyLoop } from './agent/loop.js';
import { env } from './config/env.js';
import { prisma } from './db/client.js';

async function main() {
  const app = await buildApp();
  const strategyLoop = new StrategyLoop();

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}. Shutting down gracefully.`);
    await strategyLoop.stop();
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
      port: env.PORT,
      host: '0.0.0.0',
    });
    app.log.info(`PolicyMint backend running on port ${env.PORT}`);

    if (env.AGENT_ID) {
      await strategyLoop.start();
    } else {
      app.log.warn('AGENT_ID not set; strategy loop disabled');
    }
  } catch (err) {
    app.log.error(err);
    await strategyLoop.stop();
    await prisma.$disconnect();
    process.exit(1);
  }
}

void main();
