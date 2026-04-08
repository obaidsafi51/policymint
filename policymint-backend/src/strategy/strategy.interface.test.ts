import { describe, expect, it } from 'vitest';

describe('strategy.interface module', () => {
  it('loads without runtime side effects', async () => {
    const module = await import('./strategy.interface.js');
    expect(module).toBeTypeOf('object');
  });
});
