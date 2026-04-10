import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('captureErrorToSentry', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('is a no-op when SENTRY_DSN is not configured', async () => {
    vi.doMock('../config/env.js', () => ({
      env: {
        SENTRY_DSN: undefined,
      },
    }));

    vi.doMock('./logger.js', () => ({
      logger: {
        debug: vi.fn(),
      },
    }));

    const { captureErrorToSentry } = await import('./telemetry.js');

    await captureErrorToSentry({
      error: new Error('test error'),
      tags: { stage: 'unit' },
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends an event payload when SENTRY_DSN is configured', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    vi.doMock('../config/env.js', () => ({
      env: {
        SENTRY_DSN: 'https://publickey@o123.ingest.sentry.io/456',
      },
    }));

    vi.doMock('./logger.js', () => ({
      logger: {
        debug: vi.fn(),
      },
    }));

    const { captureErrorToSentry } = await import('./telemetry.js');

    await captureErrorToSentry({
      error: new Error('boom'),
      tags: { stage: 'unit' },
      context: { evaluation_id: 'eval-1' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/456/store/?sentry_version=7&sentry_key=publickey'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
});
