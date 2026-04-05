import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'node:child_process';
import { KrakenAdapter } from '../../src/exchange/kraken';

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  kill = vi.fn(() => {
    this.emit('close', null);
    return true;
  });
}

describe('KrakenAdapter', () => {
  const spawnMock = vi.mocked(spawn);

  beforeEach(() => {
    vi.useRealTimers();
    spawnMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('paperBuy uses the expected command array', async () => {
    const processHandle = new MockChildProcess();
    spawnMock.mockReturnValue(processHandle as never);

    const adapter = new KrakenAdapter();
    const promise = adapter.paperBuy('BTCUSD', 0.0012349);

    processHandle.emit('close', 0);
    await promise;

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnMock).toHaveBeenCalledWith(
      'kraken',
      ['paper', 'buy', 'BTCUSD', '0.001234'],
      expect.objectContaining({ timeout: 15000 }),
    );
  });

  it('returns timedOut=true on timeout without throwing', async () => {
    vi.useFakeTimers();
    const processHandle = new MockChildProcess();
    spawnMock.mockReturnValue(processHandle as never);

    const adapter = new KrakenAdapter();
    const resultPromise = adapter.paperBuy('BTCUSD', 0.001);

    await vi.advanceTimersByTimeAsync(15_000);
    const result = await resultPromise;

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(processHandle.kill).toHaveBeenCalled();
  });

  it('returns success=false when exit code is non-zero', async () => {
    const processHandle = new MockChildProcess();
    spawnMock.mockReturnValue(processHandle as never);

    const adapter = new KrakenAdapter();
    const promise = adapter.paperSell('BTCUSD', 0.001);

    processHandle.emit('close', 1);
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.timedOut).toBe(false);
  });
});
