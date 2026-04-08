import { describe, expect, it, vi } from 'vitest';

const indexImportMock = vi.hoisted(() => vi.fn());

vi.mock('./index.js', () => {
  indexImportMock();
  return {};
});

describe('server entrypoint', () => {
  it('loads index module for side effects', async () => {
    vi.resetModules();
    indexImportMock.mockClear();

    await import('./server.js');

    expect(indexImportMock).toHaveBeenCalledTimes(1);
  });
});
