import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EvaluateIntentInput } from '../../../src/modules/policy-engine/evaluate.schema';

const TEST_SIGNER_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const ORIGINAL_SIGNER_PRIVATE_KEY = process.env.POLICY_SIGNER_PRIVATE_KEY;

const validIntent: EvaluateIntentInput = {
  agent_id: '550e8400-e29b-41d4-a716-446655440000',
  action_type: 'trade',
  venue: 'kraken-spot',
  amount: '1000000000000000000',
  token_in: 'ETH',
  token_out: 'USDC',
  eip712_domain: {
    name: 'PolicyMint',
    version: '1',
    chainId: 84532,
    verifyingContract: '0x0000000000000000000000000000000000000000'
  },
  params: {}
};

async function loadSigner() {
  return import('../../../src/modules/policy-engine/eip712.service');
}

describe('eip712.service', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.POLICY_SIGNER_PRIVATE_KEY = ORIGINAL_SIGNER_PRIVATE_KEY ?? TEST_SIGNER_PRIVATE_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.POLICY_SIGNER_PRIVATE_KEY = ORIGINAL_SIGNER_PRIVATE_KEY ?? TEST_SIGNER_PRIVATE_KEY;
  });

  it('returns a 0x-prefixed 65-byte signature on happy path', async () => {
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const { signEvaluatedIntent } = await loadSigner();

    const signature = await signEvaluatedIntent({
      intent: validIntent,
      result: 'allow'
    });

    expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
    expect(signature.length).toBe(132);
    dateSpy.mockRestore();
  });

  it('is deterministic for identical key and message', async () => {
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const { signEvaluatedIntent } = await loadSigner();

    const first = await signEvaluatedIntent({ intent: validIntent, result: 'allow' });
    const second = await signEvaluatedIntent({ intent: validIntent, result: 'allow' });

    expect(first).toBe(second);
    dateSpy.mockRestore();
  });

  it('throws for non-allowlisted chainId', async () => {
    const { signEvaluatedIntent } = await loadSigner();

    await expect(
      signEvaluatedIntent({
        intent: {
          ...validIntent,
          eip712_domain: {
            ...validIntent.eip712_domain,
            chainId: 1
          }
        },
        result: 'allow'
      })
    ).rejects.toThrow('not permitted');
  });

  it('does not throw for allowlisted chainId', async () => {
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const { signEvaluatedIntent } = await loadSigner();

    await expect(
      signEvaluatedIntent({
        intent: {
          ...validIntent,
          eip712_domain: {
            ...validIntent.eip712_domain,
            chainId: 84532
          }
        },
        result: 'allow'
      })
    ).resolves.toMatch(/^0x[a-fA-F0-9]{130}$/);

    dateSpy.mockRestore();
  });

  it('throws during module initialization when signer env var is missing', async () => {
    const previousValue = process.env.POLICY_SIGNER_PRIVATE_KEY;
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: string | number | null) => {
      throw new Error(`process.exit:${code}`);
    }) as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      delete process.env.POLICY_SIGNER_PRIVATE_KEY;
      vi.resetModules();
      await expect(loadSigner()).rejects.toThrow('process.exit:1');
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      process.env.POLICY_SIGNER_PRIVATE_KEY = previousValue ?? TEST_SIGNER_PRIVATE_KEY;
      vi.resetModules();
    }
  });

  it('captures result field in signed payload by producing different signatures for allow vs block', async () => {
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const { signEvaluatedIntent } = await loadSigner();

    const allowSignature = await signEvaluatedIntent({ intent: validIntent, result: 'allow' });
    const blockSignature = await signEvaluatedIntent({ intent: validIntent, result: 'block' });

    expect(allowSignature).not.toBe(blockSignature);
    dateSpy.mockRestore();
  });
});
