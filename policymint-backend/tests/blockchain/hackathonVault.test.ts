import { beforeEach, describe, expect, it, vi } from 'vitest';

const writeContractMock = vi.fn();
const waitForReceiptMock = vi.fn();
const readContractMock = vi.fn();

vi.mock('../../src/config/env', () => ({
  env: {
    HACKATHON_VAULT_ADDRESS: '0x0E7CD8ef9743FEcf94f9103033a044caBD45fC90',
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

describe('hackathonVault', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writeContractMock.mockResolvedValue('0xabc123');
    waitForReceiptMock.mockResolvedValue({ status: 'success' });
  });

  it('claims allocation successfully for a valid agent id', async () => {
    const { claimHackathonAllocation } = await import('../../src/lib/blockchain/hackathonVault');

    const txHash = await claimHackathonAllocation(BigInt(42));

    expect(txHash).toBe('0xabc123');
    expect(writeContractMock).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'claimAllocation',
        args: [BigInt(42)],
      }),
    );
  });

  it('throws when claim allocation transaction is reverted', async () => {
    waitForReceiptMock.mockResolvedValue({ status: 'reverted' });
    const { claimHackathonAllocation } = await import('../../src/lib/blockchain/hackathonVault');

    await expect(claimHackathonAllocation(BigInt(42))).rejects.toThrow(
      'HackathonVault.claimAllocation() reverted',
    );
  });

  it('surfaces contract rejection for invalid agent id values', async () => {
    writeContractMock.mockRejectedValue(new Error('execution reverted: invalid agentId'));
    const { claimHackathonAllocation } = await import('../../src/lib/blockchain/hackathonVault');

    await expect(claimHackathonAllocation(BigInt(0))).rejects.toThrow('invalid agentId');
  });

  it('reads allocation amount for an agent', async () => {
    readContractMock.mockResolvedValue(BigInt(50_000_000_000_000_000));
    const { getHackathonAllocation } = await import('../../src/lib/blockchain/hackathonVault');

    const allocation = await getHackathonAllocation(BigInt(42));

    expect(allocation).toBe(BigInt(50_000_000_000_000_000));
    expect(readContractMock).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'getAllocation',
        args: [BigInt(42)],
      }),
    );
  });
});
