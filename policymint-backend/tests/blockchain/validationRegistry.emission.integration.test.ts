import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../src/db/client';
import { buildApp } from '../../src/app';
import { generateApiKey } from '../../src/lib/crypto';
import { generateId } from '../../src/lib/uuid';
import * as validationRegistry from '../../src/lib/blockchain/validationRegistry';
import * as reputationRegistry from '../../src/lib/blockchain/reputationRegistry';
import * as riskRouter from '../../src/lib/blockchain/riskRouter';
import { describeDb } from '../helpers/db';

describeDb('ValidationRegistry emission integration', () => {
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
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createAgentWithApiKey(name = 'Validation Agent') {
    const id = generateId();
    const apiKey = await generateApiKey();

    await prisma.agent.create({
      data: {
        id,
        name,
        walletAddress: '0xabcdef0123456789abcdef0123456789abcdef01',
        strategyType: 'MOMENTUM',
        chainId: 11155111,
        erc8004TokenId: '42',
        apiKeyHash: apiKey.hash,
        apiKeyPrefix: apiKey.prefix,
      },
    });

    return { id, apiKey: apiKey.raw };
  }

  function evaluatePayload(agentId: string, amount = '1000000000000000000') {
    return {
      agent_id: agentId,
      action_type: 'trade',
      venue: 'kraken-spot',
      amount,
      token_in: 'ETH',
      token_out: 'USDC',
      eip712_domain: {
        name: 'PolicyMint',
        version: '1',
        chainId: 11155111,
        verifyingContract: '0x0000000000000000000000000000000000000000',
      },
      params: { side: 'buy' },
    };
  }

  it('emits validation artifact for allow decisions and writes tx hash back to DB', async () => {
    const { id, apiKey } = await createAgentWithApiKey('Allow Agent');

    const postValidationSpy = vi
      .spyOn(validationRegistry, 'postValidationRecord')
      .mockResolvedValue({
        txHash: `0x${'a'.repeat(64)}` as `0x${string}`,
        blockNumber: BigInt(120),
        checkpointHash: `0x${'b'.repeat(64)}` as `0x${string}`,
      });

    vi.spyOn(validationRegistry, 'canPostValidationOnChain').mockReturnValue(true);
    vi.spyOn(riskRouter, 'submitTradeIntent').mockResolvedValue({
      txHash: `0x${'f'.repeat(64)}` as `0x${string}`,
    });
    vi.spyOn(riskRouter, 'waitForTradeIntentConfirmation').mockResolvedValue();
    vi.spyOn(reputationRegistry, 'canEmitReputationSignalOnChain').mockReturnValue(false);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: {
        authorization: `Bearer ${apiKey}`,
      },
      payload: evaluatePayload(id),
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.result).toBe('allow');

    await vi.waitFor(() => {
      expect(postValidationSpy).toHaveBeenCalledTimes(2);
    });

    expect(postValidationSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        agentId: BigInt(42),
        evaluationId: body.evaluation_id,
        score: 70,
      }),
    );

    expect(postValidationSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        agentId: BigInt(42),
        evaluationId: body.evaluation_id,
        score: 95,
      }),
    );

    await vi.waitFor(async () => {
      const persisted = await prisma.validationRecord.findFirst({
        where: { evaluationId: body.evaluation_id },
      });

      expect(persisted?.txHash).toBe(`0x${'a'.repeat(64)}`);
      expect(persisted?.strategyCheckpointHash).toBe(`0x${'b'.repeat(64)}`);
    });
  });

  it('emits validation artifact for block decisions and writes tx hash back to DB', async () => {
    const { id, apiKey } = await createAgentWithApiKey('Block Agent');

    await prisma.policy.create({
      data: {
        agentId: id,
        type: 'SPEND_CAP_PER_TX',
        params: { max_amount_wei: '999999999999999999' },
        isActive: true,
      },
    });

    const postValidationSpy = vi
      .spyOn(validationRegistry, 'postValidationRecord')
      .mockResolvedValue({
        txHash: `0x${'c'.repeat(64)}` as `0x${string}`,
        blockNumber: BigInt(121),
        checkpointHash: `0x${'d'.repeat(64)}` as `0x${string}`,
      });

    vi.spyOn(validationRegistry, 'canPostValidationOnChain').mockReturnValue(true);
    vi.spyOn(reputationRegistry, 'canEmitReputationSignalOnChain').mockReturnValue(false);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: {
        authorization: `Bearer ${apiKey}`,
      },
      payload: evaluatePayload(id),
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.result).toBe('block');
    expect(typeof body.reason).toBe('string');
    expect((body.reason as string).length).toBeGreaterThan(0);

    await vi.waitFor(() => {
      expect(postValidationSpy).toHaveBeenCalledTimes(1);
    });

    expect(postValidationSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: BigInt(42),
        evaluationId: body.evaluation_id,
        score: 40,
      }),
    );

    await vi.waitFor(async () => {
      const persisted = await prisma.validationRecord.findFirst({
        where: { evaluationId: body.evaluation_id },
      });

      expect(persisted?.txHash).toBe(`0x${'c'.repeat(64)}`);
      expect(persisted?.strategyCheckpointHash).toBe(`0x${'d'.repeat(64)}`);
    });
  });

  it('uses score 70 for allow decisions when execution is unconfirmed or reverted', async () => {
    const { id, apiKey } = await createAgentWithApiKey('Allow Unconfirmed Agent');

    const postValidationSpy = vi
      .spyOn(validationRegistry, 'postValidationRecord')
      .mockResolvedValue({
        txHash: `0x${'1'.repeat(64)}` as `0x${string}`,
        blockNumber: BigInt(130),
        checkpointHash: `0x${'2'.repeat(64)}` as `0x${string}`,
      });

    vi.spyOn(validationRegistry, 'canPostValidationOnChain').mockReturnValue(true);
    vi.spyOn(riskRouter, 'submitTradeIntent').mockRejectedValue(new Error('execution reverted'));
    vi.spyOn(reputationRegistry, 'canEmitReputationSignalOnChain').mockReturnValue(false);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: {
        authorization: `Bearer ${apiKey}`,
      },
      payload: evaluatePayload(id),
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.result).toBe('allow');

    await vi.waitFor(() => {
      expect(postValidationSpy).toHaveBeenCalledTimes(1);
    });

    expect(postValidationSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: BigInt(42),
        evaluationId: body.evaluation_id,
        score: 70,
      }),
    );
  });
});
