import { logger } from '../lib/logger.js';

const KRAKEN_WS_URL = 'wss://ws.kraken.com/v2';
const RECONNECT_DELAY_MS = 2_000;
const INACTIVITY_TIMEOUT_MS = 30_000;
const CONNECT_TIMEOUT_MS = 10_000;

interface SubscriptionAckMessage {
  method?: string;
  success?: boolean;
  error?: string;
}

interface TickerMessage {
  channel?: string;
  type?: string;
  data?: Array<{ last?: number }>;
}

type SocketLike = {
  send(data: string): void;
  close(): void;
  terminate?: () => void;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  addEventListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

function getWebSocketCtor(): new (url: string) => SocketLike {
  const socketCtor = (globalThis as { WebSocket?: new (url: string) => SocketLike }).WebSocket;

  if (!socketCtor) {
    throw new Error('Global WebSocket is not available in this runtime');
  }

  return socketCtor;
}

export class KrakenWebSocket {
  private socket: SocketLike | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private connectTimeoutTimer: NodeJS.Timeout | null = null;
  private shouldReconnect = true;
  private connectResolve: (() => void) | null = null;
  private connectReject: ((error: Error) => void) | null = null;

  constructor(private readonly onPrice: (price: number) => void) {}

  connect(): Promise<void> {
    this.shouldReconnect = true;
    this.clearConnectTimeoutTimer();

    return new Promise((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;
      this.openConnection();

      this.connectTimeoutTimer = setTimeout(() => {
        if (!this.connectReject) {
          return;
        }

        this.rejectConnectIfPending(new Error(`WebSocket connection timeout after ${CONNECT_TIMEOUT_MS}ms`));
      }, CONNECT_TIMEOUT_MS);
    });
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.clearReconnectTimer();
    this.clearInactivityTimer();
    this.clearConnectTimeoutTimer();
    this.rejectConnectIfPending(new Error('WebSocket disconnected before subscription ack'));

    if (this.socket) {
      try {
        this.socket.close();
      } catch (error) {
        logger.warn({ err: error }, 'Failed to close Kraken WebSocket cleanly');
      }
      this.socket = null;
    }
  }

  private openConnection(): void {
    this.clearReconnectTimer();

    const WebSocketCtor = getWebSocketCtor();
    const socket = new WebSocketCtor(KRAKEN_WS_URL);
    this.socket = socket;

    const onOpen = () => {
      this.sendSubscribe();
      this.resetInactivityTimer();
    };

    const onMessage = (raw: unknown) => {
      this.resetInactivityTimer();
      this.handleMessage(raw);
    };

    const onError = (error: unknown) => {
      logger.error({ err: error }, 'Kraken WebSocket error');
      this.scheduleReconnect();
    };

    const onClose = () => {
      this.scheduleReconnect();
    };

    this.bind(socket, 'open', onOpen);
    this.bind(socket, 'message', onMessage);
    this.bind(socket, 'error', onError);
    this.bind(socket, 'close', onClose);
  }

  private bind(socket: SocketLike, event: string, handler: (...args: unknown[]) => void): void {
    if (typeof socket.on === 'function') {
      socket.on(event, handler);
      return;
    }

    if (typeof socket.addEventListener === 'function') {
      socket.addEventListener(event, (...args: unknown[]) => {
        if (event !== 'message') {
          handler(...args);
          return;
        }

        const payload =
          typeof args[0] === 'object' && args[0] !== null && 'data' in (args[0] as Record<string, unknown>)
            ? (args[0] as { data: unknown }).data
            : args[0];

        handler(payload);
      });
    }
  }

  private sendSubscribe(): void {
    if (!this.socket) {
      return;
    }

    this.socket.send(JSON.stringify({
      method: 'subscribe',
      params: {
        channel: 'ticker',
        symbol: ['BTC/USD'],
        event_trigger: 'trades',
        snapshot: true,
      },
    }));
  }

  private handleMessage(raw: unknown): void {
    const rawText = this.toText(raw);
    if (!rawText) {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      logger.debug({ payload: rawText }, 'Ignoring non-JSON Kraken WebSocket message');
      return;
    }

    const ack = parsed as SubscriptionAckMessage;
    if (ack.method === 'subscribe') {
      if (ack.success === true) {
        this.resolveConnectIfPending();
        logger.info({ event: 'KRAKEN_WS_SUBSCRIBED' }, 'Kraken ticker subscribed');
        return;
      }

      const errorMessage = ack.error ?? 'Kraken subscribe failed';
      logger.error({ error: errorMessage }, 'Kraken WebSocket subscription failed');
      this.rejectConnectIfPending(new Error(errorMessage));
      this.disconnect();
      return;
    }

    const ticker = parsed as TickerMessage;
    if (ticker.channel === 'heartbeat') {
      return;
    }

    if (ticker.channel === 'ticker' && (ticker.type === 'snapshot' || ticker.type === 'update')) {
      const price = ticker.data?.[0]?.last;
      if (typeof price === 'number' && Number.isFinite(price) && price > 0) {
        this.onPrice(price);
      }
    }
  }

  private toText(input: unknown): string | null {
    if (typeof input === 'string') {
      return input;
    }

    if (input instanceof Uint8Array) {
      return Buffer.from(input).toString('utf8');
    }

    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
      return input.toString('utf8');
    }

    return null;
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect || this.reconnectTimer) {
      return;
    }

    this.clearInactivityTimer();

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openConnection();
    }, RECONNECT_DELAY_MS);
  }

  private resetInactivityTimer(): void {
    this.clearInactivityTimer();

    this.inactivityTimer = setTimeout(() => {
      logger.warn({ event: 'KRAKEN_WS_TIMEOUT' }, 'Kraken WebSocket inactivity timeout; reconnecting');
      if (this.socket?.terminate) {
        this.socket.terminate();
      } else {
        this.socket?.close();
      }
    }, INACTIVITY_TIMEOUT_MS);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  private resolveConnectIfPending(): void {
    if (!this.connectResolve) {
      return;
    }

    this.clearConnectTimeoutTimer();
    this.connectResolve();
    this.connectResolve = null;
    this.connectReject = null;
  }

  private rejectConnectIfPending(error: Error): void {
    if (!this.connectReject) {
      return;
    }

    this.clearConnectTimeoutTimer();
    this.connectReject(error);
    this.connectResolve = null;
    this.connectReject = null;
  }

  private clearConnectTimeoutTimer(): void {
    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer);
      this.connectTimeoutTimer = null;
    }
  }
}
