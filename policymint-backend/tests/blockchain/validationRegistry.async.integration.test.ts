import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../src/db/client';
import { buildApp } from '../../src/app';
import { generateApiKey } from '../../src/lib/crypto';
import { generateId } from '../../src/lib/uuid';
import * as validationRegistry from '../../src/lib/blockchain/validationRegistry';
import * as reputationRegistry from '../../src/lib/blockchain/reputationRegistry';
import { describeDb } from '../helpers/db';

describeDb('evaluate async emission timing', () => {
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

  it('returns HTTP response before on-chain validation confirms', async () => {
    const id = generateId();
    const apiKey = await generateApiKey();

    await prisma.agent.create({
      data: {
        id,
        name: 'Async Timing Agent',
        walletAddress: '0xabcdef0123456789abcdef0123456789abcdef01',
        strategyType: 'MOMENTUM',
        chainId: 11155111,
        erc8004TokenId: '42',
        apiKeyHash: apiKey.hash,
        apiKeyPrefix: apiKey.prefix,
      },
    });

    let emissionResolved = false;

    vi.spyOn(validationRegistry, 'canPostValidationOnChain').mockReturnValue(true);
    vi.spyOn(validationRegistry, 'postValidationRecord').mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 3_000));
      emissionResolved = true;
      return {
        txHash: `0x${'a'.repeat(64)}` as `0x${string}`,
        blockNumber: BigInt(123),
        checkpointHash: `0x${'b'.repeat(64)}` as `0x${string}`,
      };
    });

    vi.spyOn(reputationRegistry, 'canEmitReputationSignalOnChain').mockReturnValue(false);

    const payload = {
      agent_id: id,
      action_type: 'trade',
      venue: 'kraken-spot',
      amount: '1000000000000000000',
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

    const start = Date.now();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/evaluate',
      headers: {
        authorization: `Bearer ${apiKey.raw}`,
      },
      payload,
    });
    const elapsed = Date.now() - start;

    expect(response.statusCode).toBe(200);
    expect(elapsed).toBeLessThan(500);
    expect(emissionResolved).toBe(false);
  });
});
