import { beforeEach, expect, it } from 'vitest';
import { SignalType } from '@prisma/client';
import { prisma } from '../../src/db/client';
import { generateId } from '../../src/lib/uuid';
import { describeDb } from '../helpers/db';

describeDb('reputation signal dedup safety', () => {
  beforeEach(async () => {
    await prisma.validationRecord.deleteMany();
    await prisma.intentEvaluation.deleteMany();
    await prisma.policy.deleteMany();
    await prisma.reputationSignal.deleteMany();
    await prisma.strategyCycle.deleteMany();
    await prisma.agent.deleteMany();
  });

  it('prevents duplicate reputation signals for the same evaluation cycle', async () => {
    const agentId = generateId();
    const cycleId = generateId();

    await prisma.agent.create({
      data: {
        id: agentId,
        name: 'Dedup Agent',
        walletAddress: '0xabcdef0123456789abcdef0123456789abcdef01',
        strategyType: 'MOMENTUM',
        chainId: 11155111,
        apiKeyHash: 'unused',
        apiKeyPrefix: 'pm_live_unused',
      },
    });

    await prisma.reputationSignal.create({
      data: {
        agentId,
        signalType: SignalType.POSITIVE,
        cycleId,
      },
    });

    await expect(
      prisma.reputationSignal.create({
        data: {
          agentId,
          signalType: SignalType.NEGATIVE,
          cycleId,
        },
      }),
    ).rejects.toThrow();
  });
});
