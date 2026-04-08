import { describe, expect, it } from 'vitest';

describe('types index module', () => {
  it('loads type augmentation module', async () => {
    const module = await import('./index.js');
    expect(module).toBeTypeOf('object');
  });
});
