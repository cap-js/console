import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { WebSocket } from 'ws';

const mockSetRootLogLevel = vi.fn();
const mockExtendCdsLog = vi.fn();
const mockRestoreCdsLog = vi.fn();

vi.mock('../cds-logger/extended-cds-log-factory.js', () => ({
  default: {
    getInstance: vi.fn(() => ({
      setRootLogLevel: mockSetRootLogLevel,
      extendCdsLog: mockExtendCdsLog,
      restoreCdsLog: mockRestoreCdsLog,
    })),
  },
}));

const { broadcastLogEvent, registerWebsocketHandlers } = await import('./websocket.js');

const LOG_UPDATE_MESSAGE = (logger: string) => ({
  command: 'logging/update',
  data: {
    loggers: [
      {
        logger,
        level: 'DEBUG',
        group: false,
      },
    ],
  },
});
const LOG_MESSAGE = {
  path: '/test',
  data: {
    level: 'INFO',
    logger: 'test-logger',
    thread: 'main',
    type: 'log',
    message: ['test message'],
    ts: Date.now(),
  },
};

describe('websocket', () => {
  const openConnections: Array<{ ws: WebSocket; closeHandler: () => void }> = [];
  let mockWebSocket: WebSocket;

  const getHandlerFromWebsocket = (ws: WebSocket, event: string) => {
    return (ws.on as ReturnType<typeof vi.fn>).mock.calls.find((call) => call[0] === event)?.[1];
  };

  const registerAndTrackConnection = (ws: WebSocket) => {
    registerWebsocketHandlers(ws);

    const closeHandler = getHandlerFromWebsocket(ws, 'close');
    if (closeHandler) {
      openConnections.push({ ws, closeHandler });
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockWebSocket = {
      send: vi.fn(),
      on: vi.fn(),
    } as unknown as WebSocket;
  });

  afterEach(() => {
    openConnections.forEach(({ closeHandler }) => closeHandler());
    openConnections.length = 0;
  });

  describe('registerWebsocketHandlers', () => {
    test('should register message and close handlers', () => {
      registerAndTrackConnection(mockWebSocket);

      expect(mockWebSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWebSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockWebSocket.on).toHaveBeenCalledTimes(2);
    });

    test('should only extend CdsLogFactory on first connection', () => {
      const mockWebSocket2 = {
        send: vi.fn(),
        on: vi.fn(),
      } as unknown as WebSocket;
      registerAndTrackConnection(mockWebSocket2);
      registerAndTrackConnection(mockWebSocket);
      registerAndTrackConnection(mockWebSocket2);

      expect(mockExtendCdsLog).toHaveBeenCalledTimes(1);
    });

    test('should restore original log factory on last disconnection', async () => {
      const mockWebSocket2 = {
        send: vi.fn(),
        on: vi.fn(),
      } as unknown as WebSocket;
      registerAndTrackConnection(mockWebSocket);
      registerAndTrackConnection(mockWebSocket2);

      openConnections[0].closeHandler();

      expect(mockRestoreCdsLog).not.toHaveBeenCalled();

      openConnections[1].closeHandler();

      expect(mockRestoreCdsLog).toHaveBeenCalledTimes(1);
    });

    test('should handle valid logging update message', () => {
      registerAndTrackConnection(mockWebSocket);

      const messageHandler = getHandlerFromWebsocket(mockWebSocket, 'message');
      const validMessage = Buffer.from(JSON.stringify(LOG_UPDATE_MESSAGE('root')));

      messageHandler(validMessage);

      expect(mockSetRootLogLevel).toHaveBeenCalledWith('DEBUG');
    });

    test('should ignore non-root logger updates', () => {
      registerAndTrackConnection(mockWebSocket);

      const messageHandler = getHandlerFromWebsocket(mockWebSocket, 'message');
      const validMessage = Buffer.from(JSON.stringify(LOG_UPDATE_MESSAGE('some.other.logger')));

      messageHandler(validMessage);

      expect(mockSetRootLogLevel).not.toHaveBeenCalled();
    });

    test('should ignore invalid message format', () => {
      registerAndTrackConnection(mockWebSocket);

      const messageHandler = getHandlerFromWebsocket(mockWebSocket, 'message');
      const invalidMessage = Buffer.from(JSON.stringify({ invalid: 'message' }));

      messageHandler(invalidMessage);

      expect(mockSetRootLogLevel).not.toHaveBeenCalled();
    });

    test('should handle malformed JSON gracefully', () => {
      registerAndTrackConnection(mockWebSocket);

      const messageHandler = getHandlerFromWebsocket(mockWebSocket, 'message');
      const invalidMessage = Buffer.from('not valid json');

      expect(() => messageHandler(invalidMessage)).toThrow();
    });
  });

  describe('broadcastLogEvent', () => {
    test('should broadcast log event to all open connections', () => {
      const mockWebSocket2 = {
        send: vi.fn(),
        on: vi.fn(),
      } as unknown as WebSocket;
      registerAndTrackConnection(mockWebSocket);
      registerAndTrackConnection(mockWebSocket2);

      broadcastLogEvent(LOG_MESSAGE);

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(LOG_MESSAGE));
      expect(mockWebSocket2.send).toHaveBeenCalledWith(JSON.stringify(LOG_MESSAGE));
    });

    test('should handle send errors gracefully', () => {
      (mockWebSocket.send as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Send failed');
      });

      registerAndTrackConnection(mockWebSocket);

      expect(() => broadcastLogEvent(LOG_MESSAGE)).not.toThrow();
    });
  });
});
