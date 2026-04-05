import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RiskRouterTradeIntent } from '../../../src/modules/policy-engine/trade-intent.mapper';

const TEST_SIGNER_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const ORIGINAL_AGENT_WALLET_PRIVATE_KEY = process.env.AGENT_WALLET_PRIVATE_KEY;

const validIntent: RiskRouterTradeIntent = {
  agentId: BigInt(42),
  agentWallet: '0x0000000000000000000000000000000000000002',
  pair: 'ETHUSDC',
  action: 'BUY',
  amountUsdScaled: BigInt(450_000_000),
  maxSlippageBps: BigInt(50),
  nonce: BigInt(7),
  deadline: BigInt(1_700_000_300),
};

async function loadSigner() {
  return import('../../../src/modules/policy-engine/eip712.service');
}

describe('eip712.service', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.AGENT_WALLET_PRIVATE_KEY = ORIGINAL_AGENT_WALLET_PRIVATE_KEY ?? TEST_SIGNER_PRIVATE_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.AGENT_WALLET_PRIVATE_KEY = ORIGINAL_AGENT_WALLET_PRIVATE_KEY ?? TEST_SIGNER_PRIVATE_KEY;
  });

  it('returns a 0x-prefixed 65-byte signature on happy path', async () => {
    const { signEvaluatedIntent } = await loadSigner();

    const signature = await signEvaluatedIntent({
      intent: validIntent,
    });

    expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
    expect(signature.length).toBe(132);
  });

  it('is deterministic for identical key and message', async () => {
    const { signEvaluatedIntent } = await loadSigner();

    const first = await signEvaluatedIntent({ intent: validIntent });
    const second = await signEvaluatedIntent({ intent: validIntent });

    expect(first).toBe(second);
  });

  it('throws during module initialization when signer env var is missing', async () => {
    const previousValue = process.env.AGENT_WALLET_PRIVATE_KEY;
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: string | number | null) => {
      throw new Error(`process.exit:${code}`);
    }) as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      delete process.env.AGENT_WALLET_PRIVATE_KEY;
      vi.resetModules();
      await expect(loadSigner()).rejects.toThrow('process.exit:1');
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      process.env.AGENT_WALLET_PRIVATE_KEY = previousValue ?? TEST_SIGNER_PRIVATE_KEY;
      vi.resetModules();
    }
  });

  it('produces different signatures when action changes', async () => {
    const { signEvaluatedIntent } = await loadSigner();

    const buySignature = await signEvaluatedIntent({ intent: validIntent });
    const sellSignature = await signEvaluatedIntent({ intent: { ...validIntent, action: 'SELL' } });

    expect(buySignature).not.toBe(sellSignature);
  });

  it('produces different signatures when nonce changes', async () => {
    const { signEvaluatedIntent } = await loadSigner();

    const original = await signEvaluatedIntent({
      intent: validIntent,
    });
    const changed = await signEvaluatedIntent({
      intent: { ...validIntent, nonce: BigInt(8) },
    });

    expect(original).not.toBe(changed);
  });

  it('produces different signatures when amountUsdScaled changes', async () => {
    const { signEvaluatedIntent } = await loadSigner();

    const original = await signEvaluatedIntent({
      intent: validIntent,
    });
    const changed = await signEvaluatedIntent({
      intent: { ...validIntent, amountUsdScaled: BigInt(451_000_000) },
    });

    expect(original).not.toBe(changed);
  });
});
