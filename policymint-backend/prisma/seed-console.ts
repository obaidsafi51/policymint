import { ActionType, EvaluationResult, PrismaClient, RegistryType, SignalType } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

function toHexHash(seed: number): string {
  return `0x${seed.toString(16).padStart(64, '0')}`;
}

async function main() {
  const agent = await prisma.agent.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true, erc8004TokenId: true },
  });

  if (!agent) {
    throw new Error('No agent found. Register at least one agent before seeding console data.');
  }

  const now = Date.now();
  const base = now - (10 * 24 * 60 * 60 * 1_000);

  for (let i = 0; i < 16; i += 1) {
    const id = randomUUID();
    const createdAt = new Date(base + (i * 8 * 60 * 60 * 1_000));
    const result = i % 4 === 0 ? EvaluationResult.BLOCK : EvaluationResult.ALLOW;
    const realizedPnl = result === EvaluationResult.ALLOW ? Number(((i % 5) - 2) * 1.25) : 0;
    const amountUsd = 20 + (i * 2.5);

    await prisma.intentEvaluation.create({
      data: {
        id,
        agentId: agent.id,
        policyId: null,
        actionType: ActionType.TRADE,
        venue: 'kraken',
        amountRaw: '1000000',
        tokenIn: 'USDC',
        tokenOut: 'USD',
        intentParams: {
          side: i % 2 === 0 ? 'buy' : 'sell',
          pair: 'USDC/USD',
          amount_usd: amountUsd,
          realized_pnl_usd: realizedPnl,
        },
        result,
        blockReason: result === EvaluationResult.BLOCK ? 'Daily loss budget safeguard' : null,
        eip712SignedIntent: toHexHash(1_000 + i),
        validationTxHash: toHexHash(2_000 + i),
        cycleId: result === EvaluationResult.ALLOW ? toHexHash(3_000 + i) : null,
        createdAt,
      },
    });

    await prisma.validationRecord.create({
      data: {
        evaluationId: id,
        registryType: RegistryType.ERC8004,
        txHash: toHexHash(2_000 + i),
        emittedAt: new Date(createdAt.getTime() + (30 * 1_000)),
        confirmedAt: new Date(createdAt.getTime() + (45 * 1_000)),
        blockNumber: BigInt(100_000 + i),
        strategyCheckpointHash: toHexHash(4_000 + i),
        outcomeRef: toHexHash(5_000 + i),
        agentTokenId: agent.erc8004TokenId ?? null,
      },
    });

    if (result === EvaluationResult.ALLOW) {
      await prisma.validationRecord.create({
        data: {
          evaluationId: id,
          registryType: RegistryType.ERC8004,
          txHash: toHexHash(6_000 + i),
          emittedAt: new Date(createdAt.getTime() + (90 * 1_000)),
          confirmedAt: new Date(createdAt.getTime() + (120 * 1_000)),
          blockNumber: BigInt(200_000 + i),
          strategyCheckpointHash: toHexHash(7_000 + i),
          outcomeRef: toHexHash(8_000 + i),
          agentTokenId: agent.erc8004TokenId ?? null,
        },
      });
    }
  }

  for (let i = 0; i < 6; i += 1) {
    await prisma.reputationSignal.create({
      data: {
        id: randomUUID(),
        agentId: agent.id,
        signalType: i % 2 === 0 ? SignalType.POSITIVE : SignalType.NEGATIVE,
        scoreSnapshot: 72 + (i * 3),
        txHash: toHexHash(9_000 + i),
        createdAt: new Date(base + (i * 24 * 60 * 60 * 1_000)),
      },
    });
  }

  console.log(`✅ Seeded console data for agent ${agent.id}`);
}

main()
  .catch(error => {
    console.error('❌ Console seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
