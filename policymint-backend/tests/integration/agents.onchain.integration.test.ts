import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { prisma } from '../../src/db/client';
import { buildApp } from '../../src/app';
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

describeDb('POST /v1/agents on-chain onboarding', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

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

    vi.clearAllMocks();

    canRegisterAgentOnChainMock.mockReturnValue(true);
    registerAgentOnChainMock.mockResolvedValue({
      agentId: BigInt(42),
      txHash: `0x${'a'.repeat(64)}`,
    });
    claimHackathonAllocationMock.mockResolvedValue(`0x${'b'.repeat(64)}`);
  });

  afterAll(async () => {
    await app.close();
  });

  it('stores ERC-8004 token id and registration tx hash after successful on-chain registration', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/agents',
      payload: {
        name: 'Onchain Agent',
        walletAddress: '0xAbCdEf0123456789aBCdEf0123456789abCDef01',
        strategyType: 'MOMENTUM',
      },
    });

    const body = response.json();

    expect(response.statusCode).toBe(201);
    expect(body.agent.erc8004TokenId).toBe('42');
    expect(body.agent.registrationTxHash).toBe(`0x${'a'.repeat(64)}`);
    expect(body.agent.vaultClaimedAt).toBeTypeOf('string');

    const saved = (await prisma.agent.findUnique({
      where: { id: body.agent.id },
      select: {
        erc8004TokenId: true,
        registrationTxHash: true,
        vaultClaimedAt: true,
      },
    } as never)) as {
      erc8004TokenId: string | null;
      registrationTxHash: string | null;
      vaultClaimedAt: Date | null;
    } | null;

    expect(saved?.erc8004TokenId).toBe('42');
    expect(saved?.registrationTxHash).toBe(`0x${'a'.repeat(64)}`);
    expect(saved?.vaultClaimedAt).toBeTruthy();

    expect(registerAgentOnChainMock).toHaveBeenCalledTimes(1);
    expect(registerAgentOnChainMock).toHaveBeenCalledWith({
      name: 'Onchain Agent',
      metadataURI: expect.stringContaining('/agents/'),
      strategyType: 'momentum',
    });
    expect(claimHackathonAllocationMock).toHaveBeenCalledWith(BigInt(42));
  });

  it('still returns 201 and keeps DB record when on-chain registration fails', async () => {
    registerAgentOnChainMock.mockRejectedValue(new Error('simulated chain outage'));

    const response = await app.inject({
      method: 'POST',
      url: '/v1/agents',
      payload: {
        name: 'Fallback Agent',
        walletAddress: '0xAbCdEf0123456789aBCdEf0123456789abCDef01',
      },
    });

    const body = response.json();

    expect(response.statusCode).toBe(201);
    expect(body.agent.erc8004TokenId).toBeNull();
    expect(body.agent.registrationTxHash).toBeNull();
    expect(body.agent.vaultClaimedAt).toBeNull();

    const saved = (await prisma.agent.findUnique({
      where: { id: body.agent.id },
      select: {
        erc8004TokenId: true,
        registrationTxHash: true,
        vaultClaimedAt: true,
      },
    } as never)) as {
      erc8004TokenId: string | null;
      registrationTxHash: string | null;
      vaultClaimedAt: Date | null;
    } | null;

    expect(saved?.erc8004TokenId).toBeNull();
    expect(saved?.registrationTxHash).toBeNull();
    expect(saved?.vaultClaimedAt).toBeNull();
    expect(claimHackathonAllocationMock).not.toHaveBeenCalled();
  });

  it.skip('v1.4.1 delta: rejects duplicate wallet and does not invoke a second on-chain registration', async () => {
    const payload = {
      name: 'Duplicate Onchain Agent',
      walletAddress: '0xAbCdEf0123456789aBCdEf0123456789abCDef01',
      strategyType: 'MOMENTUM',
    };

    const first = await app.inject({
      method: 'POST',
      url: '/v1/agents',
      payload,
    });

    const second = await app.inject({
      method: 'POST',
      url: '/v1/agents',
      payload,
    });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(409);
    expect(second.json().error).toBe('AGENT_WALLET_ALREADY_REGISTERED');
    expect(registerAgentOnChainMock).toHaveBeenCalledTimes(1);
    expect(claimHackathonAllocationMock).toHaveBeenCalledTimes(1);
  });
});
