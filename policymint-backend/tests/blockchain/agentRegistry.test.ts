import { beforeEach, describe, expect, it, vi } from 'vitest';

const writeContractMock = vi.fn();
const waitForReceiptMock = vi.fn();

vi.mock('../../src/config/env', () => ({
  env: {
    IDENTITY_REGISTRY_ADDRESS: '0x97b07dDc405B0c28B17559aFFE63BdB3632d0ca3',
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
  agentAccount: { address: '0x0000000000000000000000000000000000000002' },
  operatorWalletClient: {
    writeContract: writeContractMock,
  },
  publicClient: {
    waitForTransactionReceipt: waitForReceiptMock,
  },
}));

describe('registerAgentOnChain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writeContractMock.mockResolvedValue('0xabc123');
  });

  it('submits register with expected payload', async () => {
    waitForReceiptMock.mockResolvedValue({
      status: 'success',
      logs: [
        {
          address: '0x97b07dDc405B0c28B17559aFFE63BdB3632d0ca3',
          topics: [
            '0xeventtopic',
            '0x000000000000000000000000000000000000000000000000000000000000002a',
          ],
          data: '0x',
        },
      ],
    });

    const { registerAgentOnChain } = await import('../../src/lib/blockchain/agentRegistry');

    await registerAgentOnChain({
      name: 'Alpha Agent',
      description: 'Momentum strategy agent',
      capabilities: ['policy-evaluation', 'risk-routing'],
      agentURI: 'data:application/json;base64,eyJ0ZXN0Ijp0cnVlfQ==',
    });

    expect(writeContractMock).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'register',
        args: [
          '0x0000000000000000000000000000000000000002',
          'Alpha Agent',
          'Momentum strategy agent',
          ['policy-evaluation', 'risk-routing'],
          'data:application/json;base64,eyJ0ZXN0Ijp0cnVlfQ==',
        ],
      }),
    );
  });

  it('parses agentId from first indexed topic in receipt logs', async () => {
    waitForReceiptMock.mockResolvedValue({
      status: 'success',
      logs: [
        {
          address: '0x97b07dDc405B0c28B17559aFFE63BdB3632d0ca3',
          topics: [
            '0xeventtopic',
            '0x000000000000000000000000000000000000000000000000000000000000002a',
          ],
          data: '0x',
        },
      ],
    });

    const { registerAgentOnChain } = await import('../../src/lib/blockchain/agentRegistry');

    const result = await registerAgentOnChain({
      name: 'Alpha Agent',
      description: 'Momentum strategy agent',
      capabilities: ['policy-evaluation', 'risk-routing'],
      agentURI: 'data:application/json;base64,eyJ0ZXN0Ijp0cnVlfQ==',
    });

    expect(result.txHash).toBe('0xabc123');
    expect(result.agentId).toBe(BigInt(42));
  });

  it('throws when receipt logs cannot be parsed to non-zero agentId', async () => {
    waitForReceiptMock.mockResolvedValue({
      status: 'success',
      logs: [
        {
          address: '0x97b07dDc405B0c28B17559aFFE63BdB3632d0ca3',
          topics: ['0xeventtopic'],
          data: '0x',
        },
      ],
    });

    const { registerAgentOnChain } = await import('../../src/lib/blockchain/agentRegistry');

    await expect(
      registerAgentOnChain({
        name: 'Alpha Agent',
        description: 'Momentum strategy agent',
        capabilities: ['policy-evaluation', 'risk-routing'],
        agentURI: 'data:application/json;base64,eyJ0ZXN0Ijp0cnVlfQ==',
      }),
    ).rejects.toThrow('agentId parsed as 0');
  });

  it('throws when transaction receipt status is reverted', async () => {
    waitForReceiptMock.mockResolvedValue({
      status: 'reverted',
      logs: [],
    });

    const { registerAgentOnChain } = await import('../../src/lib/blockchain/agentRegistry');

    await expect(
      registerAgentOnChain({
        name: 'Alpha Agent',
        description: 'Momentum strategy agent',
        capabilities: ['policy-evaluation', 'risk-routing'],
        agentURI: 'data:application/json;base64,eyJ0ZXN0Ijp0cnVlfQ==',
      }),
    ).rejects.toThrow('AgentRegistry.register() reverted');
  });
});
