import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encodePacked, keccak256 } from 'viem';

const writeContractMock = vi.fn();
const waitForReceiptMock = vi.fn();
const txQueueAddMock = vi.fn();

vi.mock('../../src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../../src/lib/blockchain/client', () => ({
  operatorAccount: { address: '0x0000000000000000000000000000000000000001' },
  operatorWalletClient: {
    writeContract: writeContractMock,
  },
  publicClient: {
    waitForTransactionReceipt: waitForReceiptMock,
  },
}));

vi.mock('../../src/lib/blockchain/txQueue', () => ({
  txQueue: {
    add: txQueueAddMock,
  },
}));

describe('validationRegistry', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    txQueueAddMock.mockImplementation(async (runner: () => Promise<`0x${string}`>) => runner());
    writeContractMock.mockResolvedValue(`0x${'a'.repeat(64)}` as `0x${string}`);
    waitForReceiptMock.mockResolvedValue({
      status: 'success',
      blockNumber: BigInt(123),
      gasUsed: BigInt(456),
    });
  });

  it('returns false when validation registry address is not configured', async () => {
    vi.doMock('../../src/config/env', () => ({
      env: {
        VALIDATION_REGISTRY_ADDRESS: undefined,
      },
    }));
    const module = await import('../../src/lib/blockchain/validationRegistry');

    expect(module.canPostValidationOnChain()).toBe(false);
  });

  it('submits attestation with checkpoint hash and truncated notes', async () => {
    vi.doMock('../../src/config/env', () => ({
      env: {
        VALIDATION_REGISTRY_ADDRESS: '0x1111111111111111111111111111111111111111',
      },
    }));
    const { postValidationRecord } = await import('../../src/lib/blockchain/validationRegistry');

    const checkpointData = {
      action_type: 'trade',
      venue: 'kraken-spot',
      amount: '1000000000000000000',
      timestamp: 1710000000,
    };

    const result = await postValidationRecord({
      agentId: BigInt(42),
      evaluationId: 'eval-1',
      score: 95,
      notes: 'x'.repeat(300),
      checkpointData,
    });

    const expectedCheckpointHash = keccak256(
      encodePacked(
        ['string', 'string', 'string', 'uint256'],
        [checkpointData.action_type, checkpointData.venue, checkpointData.amount, BigInt(checkpointData.timestamp)],
      ),
    );

    expect(writeContractMock).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'postEIP712Attestation',
        args: [BigInt(42), expectedCheckpointHash, 95, 'x'.repeat(128)],
      }),
    );

    expect(result).toEqual({
      txHash: `0x${'a'.repeat(64)}`,
      blockNumber: BigInt(123),
      checkpointHash: expectedCheckpointHash,
    });
  });

  it('throws for invalid score values', async () => {
    vi.doMock('../../src/config/env', () => ({
      env: {
        VALIDATION_REGISTRY_ADDRESS: '0x1111111111111111111111111111111111111111',
      },
    }));
    const { postValidationRecord } = await import('../../src/lib/blockchain/validationRegistry');

    await expect(
      postValidationRecord({
        agentId: BigInt(42),
        evaluationId: 'eval-2',
        score: 101,
        notes: 'ok',
        checkpointData: {
          action_type: 'trade',
          venue: 'kraken-spot',
          amount: '1',
          timestamp: 1710000000,
        },
      }),
    ).rejects.toThrow('Invalid attestation score: 101');
  });

  it('throws when tx receipt is reverted', async () => {
    vi.doMock('../../src/config/env', () => ({
      env: {
        VALIDATION_REGISTRY_ADDRESS: '0x1111111111111111111111111111111111111111',
      },
    }));
    waitForReceiptMock.mockResolvedValue({ status: 'reverted' });
    const { postValidationRecord } = await import('../../src/lib/blockchain/validationRegistry');

    await expect(
      postValidationRecord({
        agentId: BigInt(42),
        evaluationId: 'eval-3',
        score: 70,
        notes: 'ok',
        checkpointData: {
          action_type: 'trade',
          venue: 'kraken-spot',
          amount: '1',
          timestamp: 1710000000,
        },
      }),
    ).rejects.toThrow('ValidationRegistry.postEIP712Attestation() reverted');
  });
});
