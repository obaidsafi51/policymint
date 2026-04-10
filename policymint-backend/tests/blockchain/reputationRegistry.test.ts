import { beforeEach, describe, expect, it, vi } from 'vitest';

const writeContractMock = vi.fn();
const waitForReceiptMock = vi.fn();
const readContractMock = vi.fn();

vi.mock('../../src/config/env', () => ({
  env: {
    REPUTATION_REGISTRY_ADDRESS: '0x423a9904e39537a9997fbaF0f220d79D7d545763',
  },
}));

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
    readContract: readContractMock,
  },
}));

describe('reputationRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writeContractMock.mockResolvedValue('0xabc123');
    waitForReceiptMock.mockResolvedValue({ status: 'success' });
  });

  it('emits a positive reputation signal successfully', async () => {
    const { emitReputationSignal, FeedbackType } = await import('../../src/lib/blockchain/reputationRegistry');

    const txHash = await emitReputationSignal({
      agentId: BigInt(42),
      score: 80,
      outcomeRef: `0x${'f'.repeat(64)}`,
      comment: 'Trade executed within policy bounds',
      feedbackType: FeedbackType.POSITIVE,
    });

    expect(txHash).toBe('0xabc123');
    expect(writeContractMock).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'submitFeedback',
        args: [
          BigInt(42),
          80,
          `0x${'f'.repeat(64)}`,
          'Trade executed within policy bounds',
          1,
        ],
      }),
    );
  });

  it('reads reputation score without requiring a signed transaction', async () => {
    readContractMock.mockResolvedValue(BigInt(17));
    const { getReputationScore } = await import('../../src/lib/blockchain/reputationRegistry');

    const score = await getReputationScore(BigInt(42));

    expect(score).toBe(17);
    expect(readContractMock).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'getAverageScore',
        args: [BigInt(42)],
      }),
    );
  });

  it('throws when emission receipt status is reverted', async () => {
    waitForReceiptMock.mockResolvedValue({ status: 'reverted' });
    const { emitReputationSignal, FeedbackType } = await import('../../src/lib/blockchain/reputationRegistry');

    await expect(
      emitReputationSignal({
        agentId: BigInt(42),
        score: 20,
        outcomeRef: `0x${'e'.repeat(64)}`,
        comment: 'Trade blocked: policy violation',
        feedbackType: FeedbackType.NEGATIVE,
      }),
    ).rejects.toThrow();
  });

  it('throws when score is out of contract bounds', async () => {
    const { emitReputationSignal, FeedbackType } = await import('../../src/lib/blockchain/reputationRegistry');

    await expect(
      emitReputationSignal({
        agentId: BigInt(42),
        score: 0,
        outcomeRef: `0x${'d'.repeat(64)}`,
        comment: 'Invalid score payload',
        feedbackType: FeedbackType.NEUTRAL,
      }),
    ).rejects.toThrow('score must be between 1 and 100');
  });
});
