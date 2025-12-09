import type { IncomingMessage } from 'node:http';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { type WebSocket, WebSocketServer } from 'ws';

import * as websocket from './websocket.js';
import { startWebSocketServerWithRetry } from './websocket-server.js';

interface MockWebSocketServer extends WebSocketServer {
  on: ReturnType<typeof vi.fn>;
  once: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
}
interface MockWebSocket extends WebSocket {
  send: ReturnType<typeof vi.fn>;
}

vi.mock('./websocket.js');
vi.mock('ws');

const WS_SERVER_PORTS = [3000, 3001, 3002];
const WS_SERVER_PATH = '/cap-console/logs';
const WELCOME_MESSAGE = {
  path: '/cap-console/logs',
  data: {
    type: 'welcome',
    message: 'Welcome to CAP console plugin',
    path: WS_SERVER_PATH,
    remoteAddress: '127.0.0.1',
  },
};

describe('websocket-server', () => {
  let mockWebSocketServer: MockWebSocketServer;
  let mockWebSocket: MockWebSocket;
  let mockRequest: IncomingMessage;

  const setupSuccessListeningEvent = (mockWebSocketServer: MockWebSocketServer) => {
    mockWebSocketServer.once.mockImplementation((event: string, callback: () => void) => {
      if (event === 'listening') {
        callback();
      }
    });
  };
  const setupErrorListeningEvent = (mockWebSocketServer: MockWebSocketServer) => {
    mockWebSocketServer.once.mockImplementation((event: string) => {
      if (event === 'listening') {
        throw new Error('EADDRINUSE');
      }
    });
  };

  beforeEach(() => {
    mockWebSocketServer = {
      on: vi.fn(),
      once: vi.fn(),
      off: vi.fn(),
    } as unknown as MockWebSocketServer;

    mockWebSocket = {
      send: vi.fn(),
    } as unknown as MockWebSocket;

    mockRequest = {
      url: '/cap-console/logs',
      socket: {
        remoteAddress: '127.0.0.1',
      },
    } as unknown as IncomingMessage;

    vi.mocked(WebSocketServer).mockImplementation(() => mockWebSocketServer);
    vi.mocked(websocket.registerWebsocketHandlers).mockImplementation(vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('startWebSocketServerWithRetry', () => {
    test('should start server on first port if available', async () => {
      setupSuccessListeningEvent(mockWebSocketServer);

      const wss = await startWebSocketServerWithRetry(WS_SERVER_PORTS);

      expect(wss).toBe(mockWebSocketServer);
      expect(WebSocketServer).toHaveBeenCalledWith({ port: WS_SERVER_PORTS[0], path: WS_SERVER_PATH });
    });

    test('should retry on next port if first port fails', async () => {
      mockWebSocketServer.once.mockImplementationOnce((event: string) => {
        if (event === 'listening') {
          throw new Error('EADDRINUSE');
        }
      });
      setupSuccessListeningEvent(mockWebSocketServer);

      const wss = await startWebSocketServerWithRetry(WS_SERVER_PORTS);

      expect(wss).toBeDefined();
      expect(WebSocketServer).toHaveBeenCalledTimes(2);
      expect(WebSocketServer).toHaveBeenNthCalledWith(1, { port: WS_SERVER_PORTS[0], path: WS_SERVER_PATH });
      expect(WebSocketServer).toHaveBeenNthCalledWith(2, { port: WS_SERVER_PORTS[1], path: WS_SERVER_PATH });
    });

    test('should throw error if all ports fail', async () => {
      setupErrorListeningEvent(mockWebSocketServer);

      await expect(startWebSocketServerWithRetry(WS_SERVER_PORTS)).rejects.toThrow(
        'Failed to start WebSocket server on ports: 3000,3001'
      );

      expect(WebSocketServer).toHaveBeenCalledTimes(3);
    });

    test('should register server handlers on successful start', async () => {
      setupSuccessListeningEvent(mockWebSocketServer);

      await startWebSocketServerWithRetry([3000]);

      expect(mockWebSocketServer.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    test('should handle connection event and sent welcome message', async () => {
      let connectionHandler: (ws: WebSocket, req: IncomingMessage) => void;
      setupSuccessListeningEvent(mockWebSocketServer);
      mockWebSocketServer.on.mockImplementation(
        (event: string, callback: (ws: WebSocket, req: IncomingMessage) => void) => {
          if (event === 'connection') {
            connectionHandler = callback;
          }
        }
      );

      await startWebSocketServerWithRetry([3000]);

      connectionHandler!(mockWebSocket, mockRequest);
      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);

      expect(websocket.registerWebsocketHandlers).toHaveBeenCalledWith(mockWebSocket);

      expect(sentMessage).toMatchObject(WELCOME_MESSAGE);
      expect(sentMessage.data.timestamp).toBeDefined();
    });

    test.each([
      ['URL', { url: undefined, socket: { remoteAddress: '127.0.0.1' } }],
      ['remote address', { url: '/cap-console/logs', socket: { remoteAddress: undefined } }],
    ])('should not send welcome message if request %s is missing', async (_description, requestData) => {
      let connectionHandler: (ws: WebSocket, req: IncomingMessage) => void;
      setupSuccessListeningEvent(mockWebSocketServer);
      mockWebSocketServer.on.mockImplementation(
        (event: string, callback: (ws: WebSocket, req: IncomingMessage) => void) => {
          if (event === 'connection') {
            connectionHandler = callback;
          }
        }
      );

      const mockRequestWithMissingData = requestData as unknown as IncomingMessage;

      await startWebSocketServerWithRetry([3000]);

      connectionHandler!(mockWebSocket, mockRequestWithMissingData);

      expect(websocket.registerWebsocketHandlers).toHaveBeenCalledWith(mockWebSocket);
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });
  });
});
