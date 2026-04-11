import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/db/client';
import { isValidUUIDv7 } from '../../src/lib/uuid';
import { createOperatorJwt } from '../../src/lib/operator-jwt';
import { operatorAccount } from '../../src/lib/blockchain/client';
import { describeDb } from '../helpers/db';

const { registerAgentOnChainMock, canRegisterAgentOnChainMock, claimHackathonAllocationMock } =
  vi.hoisted(() => ({
    registerAgentOnChainMock: vi.fn(),
    canRegisterAgentOnChainMock: vi.fn(),
    claimHackathonAllocationMock: vi.fn(),
  }));

vi.mock('../../src/lib/blockchain/agentRegistry.js', () => ({
  registerAgentOnChain: registerAgentOnChainMock,
  canRegisterAgentOnChain: canRegisterAgentOnChainMock,
}));

vi.mock('../../src/lib/blockchain/hackathonVault.js', () => ({
  claimHackathonAllocation: claimHackathonAllocationMock,
}));

interface ProgressEvent {
  stepNumber: number;
  stepLabel: string;
  status: 'pending' | 'active' | 'done' | 'failed';
  message: string;
  txHash?: string;
  done?: boolean;
  result?: {
    agent: {
      id: string;
      erc8004TokenId: string | null;
      registrationTxHash: string | null;
    };
    apiKey: string;
  };
}

function extractSseEvents(rawPayload: string): ProgressEvent[] {
  return rawPayload
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => JSON.parse(line.slice(6)) as ProgressEvent);
}

describeDb('POST /v1/agents/register + GET /v1/agents/register/:registrationId/progress', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let operatorToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    await prisma.validationRecord.deleteMany();
    await prisma.intentEvaluation.deleteMany();
    await prisma.policy.deleteMany();
    await prisma.reputationSignal.deleteMany();
    await prisma.strategyCycle.deleteMany();
    await prisma.agent.deleteMany();

    canRegisterAgentOnChainMock.mockReturnValue(false);
    registerAgentOnChainMock.mockReset();
    claimHackathonAllocationMock.mockReset();

    operatorToken = createOperatorJwt({
      operatorWallet: operatorAccount.address,
      agentIds: [],
      ttlSeconds: 60 * 60,
    }).token;
  });

  afterAll(async () => {
    await app.close();
  });

  async function waitForCompletedStream(registrationId: string) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const streamResponse = await app.inject({
        method: 'GET',
        url: `/v1/agents/register/${registrationId}/progress`,
      });

      expect(streamResponse.statusCode).toBe(200);
      const events = extractSseEvents(streamResponse.body);

      if (events.some((event) => event.done === true)) {
        return events;
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    throw new Error('Timed out waiting for completed registration SSE stream');
  }

  it('returns registrationId immediately and streams all completion steps', async () => {
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/v1/agents/register',
      headers: {
        'x-operator-token': operatorToken,
      },
      payload: {
        name: 'SSE Agent Alpha',
        walletAddress: '0xAbCdEf0123456789aBCdEf0123456789abCDef01',
        strategyType: 'MOMENTUM',
      },
    });

    expect(registerResponse.statusCode).toBe(202);
    const body = registerResponse.json() as { registrationId: string };
    expect(isValidUUIDv7(body.registrationId)).toBe(true);

    const events = await waitForCompletedStream(body.registrationId);

    const labels = events.map((event) => event.stepLabel);
    expect(labels).toContain('Saving agent to database');
    expect(labels).toContain('Registering on-chain identity');
    expect(labels).toContain('Claiming sandbox capital');
    expect(labels).toContain('Storing on-chain agent ID');
    expect(labels).toContain('Generating API key');

    const finalEvent = events[events.length - 1];
    expect(finalEvent.stepNumber).toBe(5);
    expect(finalEvent.status).toBe('done');
    expect(finalEvent.done).toBe(true);
    expect(finalEvent.result?.agent.id).toBeTypeOf('string');
    expect(finalEvent.result?.apiKey.startsWith('pm_live_')).toBe(true);

    const savedAgent = await prisma.agent.findUnique({
      where: { id: finalEvent.result!.agent.id },
      select: {
        id: true,
        name: true,
        walletAddress: true,
      },
    });

    expect(savedAgent?.id).toBe(finalEvent.result?.agent.id);
    expect(savedAgent?.name).toBe('SSE Agent Alpha');
    expect(savedAgent?.walletAddress).toBe('0xabcdef0123456789abcdef0123456789abcdef01');
  });

  it('returns 409 when same wallet + name already exists', async () => {
    canRegisterAgentOnChainMock.mockReturnValue(true);
    registerAgentOnChainMock.mockResolvedValue({
      agentId: BigInt(42),
      txHash: `0x${'a'.repeat(64)}`,
    });
    claimHackathonAllocationMock.mockResolvedValue(`0x${'b'.repeat(64)}`);

    const payload = {
      name: 'Duplicate SSE Agent',
      walletAddress: '0xAbCdEf0123456789aBCdEf0123456789abCDef01',
      strategyType: 'MOMENTUM',
    };

    const first = await app.inject({
      method: 'POST',
      url: '/v1/agents/register',
      headers: {
        'x-operator-token': operatorToken,
      },
      payload,
    });

    expect(first.statusCode).toBe(202);
    const firstBody = first.json() as { registrationId: string };
    await waitForCompletedStream(firstBody.registrationId);

    const second = await app.inject({
      method: 'POST',
      url: '/v1/agents/register',
      headers: {
        'x-operator-token': operatorToken,
      },
      payload,
    });

    expect(second.statusCode).toBe(409);
    const secondBody = second.json() as {
      message: string;
      existingAgent: { id: string; name: string; walletAddress: string };
    };

    expect(secondBody.message).toContain('already registered');
    expect(secondBody.existingAgent.name).toBe(payload.name);
    expect(secondBody.existingAgent.walletAddress).toBe(payload.walletAddress.toLowerCase());
  });
});
