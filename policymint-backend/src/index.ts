import { buildApp } from './app.js';
import { StrategyLoop } from './agent/loop.js';
import { env } from './config/env.js';
import { validateStartupConfiguration } from './config/startup.js';
import { prisma } from './db/client.js';
import { registerAgentOnChain } from './lib/blockchain/agentRegistry.js';
import { claimHackathonAllocation } from './lib/blockchain/hackathonVault.js';
import { getRiskRouterIntentNonce } from './lib/blockchain/riskRouter.js';
import {
  buildCanonicalAgentURI,
  CANONICAL_AGENT_CAPABILITIES,
  CANONICAL_AGENT_DESCRIPTION,
  CANONICAL_AGENT_NAME,
} from './modules/agents/registration.constants.js';
import { captureErrorToSentry } from './lib/telemetry.js';

async function ensureStartupAgentRegistered(agentUuid: string, appLog: { info: Function; warn: Function; error: Function }) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentUuid },
    select: {
      id: true,
      erc8004TokenId: true,
      vaultClaimedAt: true,
      registrationTxHash: true,
    },
  });

  if (!agent) {
    appLog.warn({ agent_id: agentUuid }, 'AGENT_ID not found in database; skipping startup registration flow');
    return;
  }

  if (agent.erc8004TokenId) {
    if (!agent.vaultClaimedAt) {
      const existingAgentId = BigInt(agent.erc8004TokenId);
      await claimHackathonAllocation(existingAgentId);
      await prisma.agent.update({
        where: { id: agentUuid },
        data: { vaultClaimedAt: new Date() },
      });

      appLog.info(
        { agent_id: agentUuid, token_id: agent.erc8004TokenId },
        'Startup registration already exists; completed missing vault claim',
      );
    } else {
      appLog.info({ agent_id: agentUuid, token_id: agent.erc8004TokenId }, 'Startup registration already completed; skipping');
    }

    return;
  }

  const frontendUrl = process.env.POLICYMINT_FRONTEND_URL ?? 'https://your-vercel-frontend-url.vercel.app';
  const agentURI = buildCanonicalAgentURI(frontendUrl);
  const { agentId, txHash } = await registerAgentOnChain({
    name: CANONICAL_AGENT_NAME,
    description: CANONICAL_AGENT_DESCRIPTION,
    capabilities: [...CANONICAL_AGENT_CAPABILITIES],
    agentURI,
  });

  await prisma.agent.update({
    where: { id: agentUuid },
    data: {
      erc8004TokenId: agentId.toString(),
      registrationTxHash: txHash,
    },
  });

  await claimHackathonAllocation(agentId);
  await prisma.agent.update({
    where: { id: agentUuid },
    data: { vaultClaimedAt: new Date() },
  });

  appLog.info({ agent_id: agentUuid, token_id: agentId.toString(), tx_hash: txHash }, 'Startup on-chain registration and vault claim completed');
}

async function syncStartupNonceFromChain(agentUuid: string, appLog: { info: Function; warn: Function; error: Function }) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentUuid },
    select: {
      id: true,
      erc8004TokenId: true,
      lastNonce: true,
    },
  });

  if (!agent?.erc8004TokenId) {
    return;
  }

  const onChainNonce = await getRiskRouterIntentNonce(BigInt(agent.erc8004TokenId));
  const localNonce = typeof agent.lastNonce === 'bigint' ? agent.lastNonce : BigInt(agent.lastNonce);

  if (onChainNonce > localNonce) {
    await prisma.agent.update({
      where: { id: agentUuid },
      data: {
        lastNonce: onChainNonce,
      },
    });

    appLog.info(
      {
        agent_id: agentUuid,
        local_nonce: localNonce.toString(),
        onchain_nonce: onChainNonce.toString(),
      },
      'Startup nonce synchronized from RiskRouter',
    );
  }
}

async function main() {
  validateStartupConfiguration();
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
      await ensureStartupAgentRegistered(env.AGENT_ID, app.log);
      await syncStartupNonceFromChain(env.AGENT_ID, app.log);
      await strategyLoop.start();
    } else {
      app.log.warn('AGENT_ID not set; strategy loop disabled');
    }
  } catch (err) {
    app.log.error(err);
    await captureErrorToSentry({
      error: err,
      tags: { stage: 'startup' },
    });
    await strategyLoop.stop();
    await prisma.$disconnect();
    process.exit(1);
  }
}

void main();
