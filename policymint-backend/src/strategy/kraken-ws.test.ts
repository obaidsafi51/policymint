import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KrakenWebSocket } from './kraken-ws';

type EventHandler = (...args: unknown[]) => void;

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  readonly sentMessages: string[] = [];
  readonly terminate = vi.fn();
  readonly close = vi.fn();
  private readonly handlers = new Map<string, EventHandler[]>();

  constructor(_url: string) {
    MockWebSocket.instances.push(this);
  }

  on(event: string, listener: EventHandler): void {
    const existing = this.handlers.get(event) ?? [];
    existing.push(listener);
    this.handlers.set(event, existing);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  emit(event: string, payload?: unknown): void {
    const handlers = this.handlers.get(event) ?? [];
    for (const handler of handlers) {
      handler(payload);
    }
  }
}

describe('KrakenWebSocket', () => {
  const originalWebSocket = (globalThis as { WebSocket?: unknown }).WebSocket;

  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances.length = 0;
    (globalThis as { WebSocket?: unknown }).WebSocket = MockWebSocket;
  });

  afterEach(() => {
    vi.useRealTimers();
    (globalThis as { WebSocket?: unknown }).WebSocket = originalWebSocket;
  });

  it('resolves connect after subscribe acknowledgement', async () => {
    const feed = new KrakenWebSocket(() => {});
    const connectPromise = feed.connect();

    const socket = MockWebSocket.instances[0];
    socket.emit('open');
    socket.emit('message', JSON.stringify({ method: 'subscribe', success: true }));

    await expect(connectPromise).resolves.toBeUndefined();
    expect(socket.sentMessages.length).toBe(1);
    expect(socket.sentMessages[0]).toContain('BTC/USD');
  });

  it('terminates the socket after inactivity timeout', async () => {
    const feed = new KrakenWebSocket(() => {});
    const connectPromise = feed.connect();

    const socket = MockWebSocket.instances[0];
    socket.emit('open');
    socket.emit('message', JSON.stringify({ method: 'subscribe', success: true }));
    await connectPromise;

    await vi.advanceTimersByTimeAsync(30_000);
    expect(socket.terminate).toHaveBeenCalledTimes(1);
  });

  it('reconnects after close with a 2-second delay', async () => {
    const feed = new KrakenWebSocket(() => {});
    const connectPromise = feed.connect();

    const firstSocket = MockWebSocket.instances[0];
    firstSocket.emit('open');
    firstSocket.emit('message', JSON.stringify({ method: 'subscribe', success: true }));
    await connectPromise;

    firstSocket.emit('close');
    expect(MockWebSocket.instances.length).toBe(1);

    await vi.advanceTimersByTimeAsync(2_000);
    expect(MockWebSocket.instances.length).toBe(2);
  });
});
