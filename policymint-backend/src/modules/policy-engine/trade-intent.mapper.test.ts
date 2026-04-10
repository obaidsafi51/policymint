import { beforeEach, describe, expect, it, vi } from 'vitest';

const envState = vi.hoisted(() => ({
  NODE_ENV: 'test',
  PRISM_BASE_URL: 'https://api.prism.example',
  PRISM_API_KEY: 'prism-key',
}));

const getBlockMock = vi.hoisted(() => vi.fn());

vi.mock('../../config/env.js', () => ({
  env: envState,
}));

vi.mock('../../lib/blockchain/client.js', () => ({
  publicClient: {
    getBlock: getBlockMock,
  },
}));

describe('mapToRiskRouterIntent', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    envState.NODE_ENV = 'test';
    getBlockMock.mockResolvedValue({ timestamp: BigInt(1_000) });
    vi.stubGlobal('fetch', vi.fn());
  });

  it('maps trade intent in test mode with defaults', async () => {
    const { mapToRiskRouterIntent } = await import('./trade-intent.mapper.js');

    const result = await mapToRiskRouterIntent({
      intent: {
        agent_id: 'agent-1',
        action_type: 'trade',
        venue: 'kraken-spot',
        amount: '1000000000000000000',
        token_in: 'ETH',
        token_out: 'USD',
        eip712_domain: {
          name: 'PolicyMint',
          version: '1',
          chainId: 11155111,
          verifyingContract: '0x1111111111111111111111111111111111111111',
        },
        params: {
          side: 'sell',
        },
      },
      erc8004TokenId: '42',
      agentWalletAddress: '0x0000000000000000000000000000000000000002',
      nonce: BigInt(7),
    });

    expect(result).toEqual(
      expect.objectContaining({
        agentId: BigInt(42),
        agentWallet: '0x0000000000000000000000000000000000000002',
        pair: 'ETH/USD',
        action: 'SELL',
        amountUsdScaled: BigInt(1_000_000),
        maxSlippageBps: BigInt(50),
        nonce: BigInt(7),
      }),
    );
    expect(result.deadline).toBeGreaterThan(BigInt(Math.floor(Date.now() / 1000)));
  });

  it('throws when side is missing', async () => {
    const { mapToRiskRouterIntent } = await import('./trade-intent.mapper.js');

    await expect(
      mapToRiskRouterIntent({
        intent: {
          agent_id: 'agent-1',
          action_type: 'trade',
          venue: 'kraken-spot',
          amount: '1000000',
          token_in: 'USD',
          token_out: undefined,
          eip712_domain: {
            name: 'PolicyMint',
            version: '1',
            chainId: 11155111,
            verifyingContract: '0x1111111111111111111111111111111111111111',
          },
          params: {},
        },
        erc8004TokenId: '5',
        agentWalletAddress: '0x0000000000000000000000000000000000000002',
        nonce: BigInt(1),
        defaultMaxSlippageBps: 35,
      }),
    ).rejects.toThrow('RiskRouter trade intents require params.side as buy or sell');
  });

  it('throws when max_slippage_bps exceeds backend ceiling', async () => {
    const { mapToRiskRouterIntent } = await import('./trade-intent.mapper.js');

    await expect(
      mapToRiskRouterIntent({
        intent: {
          agent_id: 'agent-1',
          action_type: 'trade',
          venue: 'kraken-spot',
          amount: '1000000',
          token_in: 'USD',
          token_out: 'USD',
          eip712_domain: {
            name: 'PolicyMint',
            version: '1',
            chainId: 11155111,
            verifyingContract: '0x1111111111111111111111111111111111111111',
          },
          params: { max_slippage_bps: 999 },
        },
        erc8004TokenId: '5',
        agentWalletAddress: '0x0000000000000000000000000000000000000002',
        nonce: BigInt(1),
      }),
    ).rejects.toThrow('maxSlippageBps exceeds backend ceiling (200)');
  });

  it('uses PRISM price and latest block timestamp in production', async () => {
    envState.NODE_ENV = 'production';
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ priceUsd: 2000 }),
    }));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const { mapToRiskRouterIntent } = await import('./trade-intent.mapper.js');

    const result = await mapToRiskRouterIntent({
      intent: {
        agent_id: 'agent-1',
        action_type: 'trade',
        venue: 'kraken-spot',
        amount: '1000000000000000000',
        token_in: 'ETH',
        token_out: 'USD',
        eip712_domain: {
          name: 'PolicyMint',
          version: '1',
          chainId: 11155111,
          verifyingContract: '0x1111111111111111111111111111111111111111',
        },
        params: { side: 'buy' },
      },
      erc8004TokenId: '9',
      agentWalletAddress: '0x0000000000000000000000000000000000000002',
      nonce: BigInt(2),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getBlockMock).toHaveBeenCalledWith({ blockTag: 'latest' });
    expect(result.amountUsdScaled).toBe(BigInt(2_000_000_000));
    expect(result.deadline).toBe(BigInt(1_300));
  });

  it('falls back to Kraken when PRISM response is not ok', async () => {
    envState.NODE_ENV = 'production';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { XXBTZUSD: { c: ['30000.0'] } } }),
      });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const { mapToRiskRouterIntent } = await import('./trade-intent.mapper.js');

    const result = await mapToRiskRouterIntent({
      intent: {
        agent_id: 'agent-1',
        action_type: 'trade',
        venue: 'kraken-spot',
        amount: '100000000',
        token_in: 'BTC',
        token_out: 'USD',
        eip712_domain: {
          name: 'PolicyMint',
          version: '1',
          chainId: 11155111,
          verifyingContract: '0x1111111111111111111111111111111111111111',
        },
        params: { side: 'buy' },
      },
      erc8004TokenId: '9',
      agentWalletAddress: '0x0000000000000000000000000000000000000002',
      nonce: BigInt(2),
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.amountUsdScaled).toBe(BigInt(30_000_000_000));
  });

  it('throws when converted amount exceeds safe integer range', async () => {
    const { mapToRiskRouterIntent } = await import('./trade-intent.mapper.js');

    await expect(
      mapToRiskRouterIntent({
        intent: {
          agent_id: 'agent-1',
          action_type: 'trade',
          venue: 'kraken-spot',
          amount: '9007199254740992000000',
          token_in: 'USD',
          token_out: 'USD',
          eip712_domain: {
            name: 'PolicyMint',
            version: '1',
            chainId: 11155111,
            verifyingContract: '0x1111111111111111111111111111111111111111',
          },
          params: { side: 'buy' },
        },
        erc8004TokenId: '9',
        agentWalletAddress: '0x0000000000000000000000000000000000000002',
        nonce: BigInt(2),
      }),
    ).rejects.toThrow('Amount exceeds safe integer range');
  });
});
