import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { EvaluationResult, RegistryType } from '@prisma/client';
import { prisma } from '../../src/db/client';
import { buildApp } from '../../src/app';
import { generateId } from '../../src/lib/uuid';
import { describeDb } from '../helpers/db';

describeDb('PATCH /v1/evaluations/:id/tx-hash', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  async function createAgent() {
    const id = generateId();

    await prisma.agent.create({
      data: {
        id,
        name: 'Tx Hash Agent',
        walletAddress: `0x${'1'.repeat(40)}`,
        strategyType: 'MOMENTUM',
        chainId: 84532,
        apiKeyHash: 'unused-for-this-route',
        apiKeyPrefix: 'pm_live_unused'
      }
    });

    return { id };
  }

  async function createEvaluation(agentId: string, overrides?: { validationTxHash?: string | null }) {
    const id = generateId();

    await prisma.intentEvaluation.create({
      data: {
        id,
        agentId,
        actionType: 'TRADE',
        venue: 'kraken-spot',
        amountRaw: '1000000000000000000',
        tokenIn: 'ETH',
        tokenOut: 'USDC',
        result: EvaluationResult.ALLOW,
        eip712SignedIntent: `0x${'a'.repeat(130)}`,
        validationTxHash: overrides?.validationTxHash ?? null
      }
    });

    return { id };
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 when x-internal-key is missing', async () => {
    const { id: agentId } = await createAgent();
    const { id: evaluationId } = await createEvaluation(agentId);

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/evaluations/${evaluationId}/tx-hash`,
      payload: {
        tx_hash: `0x${'b'.repeat(64)}`
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error).toBe('UNAUTHORIZED');
  });

  it('returns 400 when evaluation id is not a valid UUID', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/evaluations/not-a-uuid/tx-hash',
      headers: {
        'x-internal-key': process.env.INTERNAL_SERVICE_KEY as string
      },
      payload: {
        tx_hash: `0x${'b'.repeat(64)}`
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('INVALID_PARAMS');
  });

  it('returns 400 when tx_hash is malformed', async () => {
    const { id: agentId } = await createAgent();
    const { id: evaluationId } = await createEvaluation(agentId);

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/evaluations/${evaluationId}/tx-hash`,
      headers: {
        'x-internal-key': process.env.INTERNAL_SERVICE_KEY as string
      },
      payload: {
        tx_hash: '0x1234'
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('INVALID_BODY');
  });

  it('returns 404 when evaluation does not exist', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/evaluations/${generateId()}/tx-hash`,
      headers: {
        'x-internal-key': process.env.INTERNAL_SERVICE_KEY as string
      },
      payload: {
        tx_hash: `0x${'c'.repeat(64)}`
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe('EVALUATION_NOT_FOUND');
  });

  it('returns 409 when tx_hash is already set', async () => {
    const { id: agentId } = await createAgent();
    const existingHash = `0x${'d'.repeat(64)}`;
    const { id: evaluationId } = await createEvaluation(agentId, {
      validationTxHash: existingHash
    });

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/evaluations/${evaluationId}/tx-hash`,
      headers: {
        'x-internal-key': process.env.INTERNAL_SERVICE_KEY as string
      },
      payload: {
        tx_hash: `0x${'e'.repeat(64)}`
      }
    });

    const body = response.json();

    expect(response.statusCode).toBe(409);
    expect(body.error).toBe('TX_HASH_ALREADY_SET');
    expect(body.existing_tx_hash).toBe(existingHash);
  });

  it('returns 200, writes tx hash to intent_evaluations and creates validation_records row', async () => {
    const { id: agentId } = await createAgent();
    const { id: evaluationId } = await createEvaluation(agentId);
    const txHash = `0x${'f'.repeat(64)}`;

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/evaluations/${evaluationId}/tx-hash`,
      headers: {
        'x-internal-key': process.env.INTERNAL_SERVICE_KEY as string
      },
      payload: {
        tx_hash: txHash
      }
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.evaluation_id).toBe(evaluationId);
    expect(body.tx_hash).toBe(txHash);
    expect(body.etherscan_url).toBe(`https://sepolia.etherscan.io/tx/${txHash}`);

    const savedEvaluation = await prisma.intentEvaluation.findUnique({
      where: { id: evaluationId }
    });

    expect(savedEvaluation?.validationTxHash).toBe(txHash);
    expect(savedEvaluation?.emittedAt).not.toBeNull();

    const savedValidationRecord = await prisma.validationRecord.findFirst({
      where: { evaluationId }
    });

    expect(savedValidationRecord).toBeTruthy();
    expect(savedValidationRecord?.txHash).toBe(txHash);
    expect(savedValidationRecord?.registryType).toBe(RegistryType.ERC8004);
  });

  it('updates existing validation_records row tx_hash when record already exists', async () => {
    const { id: agentId } = await createAgent();
    const { id: evaluationId } = await createEvaluation(agentId);

    await prisma.validationRecord.create({
      data: {
        id: generateId(),
        evaluationId,
        registryType: RegistryType.ERC8004,
        txHash: `0x${'1'.repeat(64)}`
      }
    });

    const txHash = `0x${'2'.repeat(64)}`;

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/evaluations/${evaluationId}/tx-hash`,
      headers: {
        'x-internal-key': process.env.INTERNAL_SERVICE_KEY as string
      },
      payload: {
        tx_hash: txHash
      }
    });

    expect(response.statusCode).toBe(200);

    const records = await prisma.validationRecord.findMany({
      where: { evaluationId, registryType: RegistryType.ERC8004 }
    });

    expect(records).toHaveLength(1);
    expect(records[0]?.txHash).toBe(txHash);
  });
});
