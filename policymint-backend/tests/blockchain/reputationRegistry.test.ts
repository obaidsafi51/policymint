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
  signerAccount: { address: '0x0000000000000000000000000000000000000001' },
  walletClient: {
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
    const { emitReputationSignal } = await import('../../src/lib/blockchain/reputationRegistry');

    const txHash = await emitReputationSignal({
      agentId: BigInt(42),
      positive: true,
      reason: 'Policy allow: trade on kraken-spot',
    });

    expect(txHash).toBe('0xabc123');
    expect(writeContractMock).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'emitSignal',
        args: [BigInt(42), true, 'Policy allow: trade on kraken-spot'],
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
        functionName: 'getScore',
        args: [BigInt(42)],
      }),
    );
  });

  it('throws when emission receipt status is reverted', async () => {
    waitForReceiptMock.mockResolvedValue({ status: 'reverted' });
    const { emitReputationSignal } = await import('../../src/lib/blockchain/reputationRegistry');

    await expect(
      emitReputationSignal({
        agentId: BigInt(42),
        positive: false,
        reason: 'Policy block',
      }),
    ).rejects.toThrow();
  });
});
