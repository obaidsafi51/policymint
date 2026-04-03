import { describe, expect, it } from 'vitest';
import { generateApiKey, verifyApiKey } from './crypto';

describe('crypto utility', () => {
  it('returns expected API key shape', async () => {
    const result = await generateApiKey();

    expect(result.raw.startsWith('pm_live_')).toBe(true);
    expect(result.prefix.startsWith('pm_live_')).toBe(true);
    expect(result.raw.startsWith(result.prefix)).toBe(true);
    expect(result.prefix.length).toBe(16);
    expect(result.hash.length).toBeGreaterThan(0);
    expect(result.hash.startsWith('$2')).toBe(true);
    expect(result.raw).not.toBe(result.hash);
  });

  it('supports round-trip verification', async () => {
    const { raw, hash } = await generateApiKey();
    await expect(verifyApiKey(raw, hash)).resolves.toBe(true);
  });

  it('rejects wrong API keys', async () => {
    const { hash } = await generateApiKey();
    await expect(verifyApiKey('pm_live_wrong', hash)).resolves.toBe(false);
  });

  it('produces unique values for separate calls', async () => {
    const first = await generateApiKey();
    const second = await generateApiKey();

    expect(first.raw).not.toBe(second.raw);
    expect(first.hash).not.toBe(second.hash);
    expect(first.prefix).not.toBe(second.prefix);
  });
});
