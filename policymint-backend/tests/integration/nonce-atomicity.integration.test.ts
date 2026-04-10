import { afterAll, afterEach, beforeAll, beforeEach, expect, it, describe } from 'vitest';
import { prisma } from '../../src/db/client';
import { buildApp } from '../../src/app';
import { generateApiKey } from '../../src/lib/crypto';
import { generateId } from '../../src/lib/uuid';
import { describeDb } from '../helpers/db';

describeDb('Nonce Atomicity Under Concurrent Ticks', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let walletCounter = 1;

  function nextWalletAddress() {
    const hex = walletCounter.toString(16).padStart(40, '0');
    walletCounter += 1;
    return `0x${hex}`;
  }

  async function createAgent(name = 'Concurrent Nonce Agent') {
    const id = generateId();
    const apiKey = await generateApiKey();

    await prisma.agent.create({
      data: {
        id,
        name,
        walletAddress: nextWalletAddress(),
        strategyType: 'MOMENTUM',
        erc8004TokenId: Math.floor(Math.random() * 1000).toString(),
        chainId: 11155111,
        apiKeyHash: apiKey.hash,
        apiKeyPrefix: apiKey.prefix,
        lastNonce: 0n,
        isActive: true,
      }
    });

    await prisma.policy.create({
      data: {
        id: generateId(),
        agentId: id,
        isActive: true,
        type: 'VENUE_ALLOWLIST',
        params: { allowed_venues: ['kraken-spot'] },
      }
    });

    return { id, apiKey: apiKey.raw };
  }

  function basePayload(agentId: string, overrides: Record<string, unknown> = {}) {
    return {
      agent_id: agentId,
      action_type: 'trade',
      venue: 'kraken-spot',
      amount: '1000000000000000000',
      token_in: 'ETH',
      token_out: 'USDC',
      eip712_domain: {
        name: 'PolicyMint',
        version: '1',
        chainId: 11155111,
        verifyingContract: '0x1111111111111111111111111111111111111111'
      },
      params: { side: 'buy' },
      ...overrides
    };
  }

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
    walletCounter = 1;
  });

  afterEach(() => {});

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('guarantees unique monotonic nonces when evaluate is called concurrently', async () => {
    const { id, apiKey } = await createAgent();

    const nRequests = 5;
    const payload = basePayload(id);

    // Blast the evaluate endpoint concurrently to trigger potential data races on `last_nonce`
    const results = await Promise.all(
      Array.from({ length: nRequests }).map(() =>
        app.inject({
          method: 'POST',
          url: '/v1/evaluate',
          headers: {
            authorization: `Bearer ${apiKey}`
          },
          payload
        })
      )
    );

    // They should all either succeed or return 500 bounds conflict. By design in SQL, conflicts will throw.
    const successful = results.filter((res) => res.statusCode === 200 && res.json().result === 'allow');
    const conflicts = results.filter((res) => res.statusCode === 500 && (res.json().error || '').includes('Nonce conflict'));
    const others = results.filter((res) => !successful.includes(res) && !conflicts.includes(res));

    expect(others.map(r => ({ status: r.statusCode, body: r.json() }))).toEqual([]);
    expect(successful.length + conflicts.length).toBe(nRequests);

    // Verify the DB state
    const agent = await prisma.agent.findUnique({
      where: { id },
      select: { lastNonce: true }
    });

    const evaluations = await prisma.intentEvaluation.findMany({
      where: { agentId: id, result: 'ALLOW' },
      select: { validationTxHash: true }
    });

    // The current lastNonce should exactly match the number of successful evaluations
    // since each success increments the nonce by 1 from the initial 0.
    expect(agent?.lastNonce).toBe(BigInt(successful.length));
    expect(evaluations.length).toBe(successful.length);
  });
});
