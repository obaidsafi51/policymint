import { beforeEach, describe, expect, it, vi } from 'vitest';

const writeContractMock = vi.fn();
const waitForReceiptMock = vi.fn();
const txQueueAddMock = vi.fn();

vi.mock('../../src/config/env', () => ({
  env: {
    RISK_ROUTER_ADDRESS: '0x1111111111111111111111111111111111111111',
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
  },
}));

vi.mock('../../src/lib/blockchain/txQueue', () => ({
  txQueue: {
    add: txQueueAddMock,
  },
}));

describe('riskRouter', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    txQueueAddMock.mockImplementation(async (runner: () => Promise<`0x${string}`>) => runner());
    writeContractMock.mockResolvedValue(`0x${'a'.repeat(64)}` as `0x${string}`);
    waitForReceiptMock.mockResolvedValue({
      status: 'success',
      blockNumber: BigInt(999),
      gasUsed: BigInt(777),
    });
  });

  it('submits trade intent on-chain and returns tx hash', async () => {
    const { submitTradeIntent } = await import('../../src/lib/blockchain/riskRouter');

    const intent = {
      agentId: BigInt(42),
      agentWallet: '0x0000000000000000000000000000000000000002' as `0x${string}`,
      pair: 'ETH/USD',
      action: 'buy',
      amountUsdScaled: BigInt(100000000),
      maxSlippageBps: BigInt(50),
      nonce: BigInt(1),
      deadline: BigInt(1710000300),
    };

    const result = await submitTradeIntent({
      intent,
      signature: `0x${'b'.repeat(130)}` as `0x${string}`,
    });

    expect(writeContractMock).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'submitTradeIntent',
        args: [intent, `0x${'b'.repeat(130)}`],
      }),
    );
    expect(result).toEqual({ txHash: `0x${'a'.repeat(64)}` });
  });

  it('confirms successful trade intent transaction', async () => {
    const { waitForTradeIntentConfirmation } = await import('../../src/lib/blockchain/riskRouter');

    await expect(waitForTradeIntentConfirmation(`0x${'c'.repeat(64)}` as `0x${string}`)).resolves.toEqual({
      txHash: `0x${'c'.repeat(64)}`,
      confirmed: true,
    });

    expect(waitForReceiptMock).toHaveBeenCalledWith({
      hash: `0x${'c'.repeat(64)}`,
      confirmations: 1,
      timeout: 90_000,
    });
  });

  it('throws when confirmation receipt is reverted', async () => {
    waitForReceiptMock.mockResolvedValue({ status: 'reverted' });
    const { waitForTradeIntentConfirmation } = await import('../../src/lib/blockchain/riskRouter');

    await expect(
      waitForTradeIntentConfirmation(`0x${'d'.repeat(64)}` as `0x${string}`),
    ).rejects.toThrow('RiskRouter.submitTradeIntent() reverted');
  });
});
