import type { IncomingMessage } from 'node:http';

import { type WebSocket, WebSocketServer } from 'ws';

import { logger } from '../index.js';
import { registerWebsocketHandlers } from './websocket.js';

export const startWebSocketServerWithRetry = async (portsToTry: Array<number>) => {
  for (const port of portsToTry) {
    try {
      const wss = await createWebSocketServer(port);
      registerServerHandlers(wss);
      logger.info(`Successfully started websocket server on port ${port}`);

      return wss;
    } catch (err) {
      logger.warn(`Failed to start websocket server - ${err}. Retrying ...`);
    }
  }

  throw new Error(`Failed to start WebSocket server on ports: ${portsToTry}`);
};

const registerServerHandlers = (wss: WebSocketServer) => {
  wss.on('connection', (ws, req) => {
    registerWebsocketHandlers(ws);
    sendWelcomeMessage(ws, req);
  });
};

const createWebSocketServer = (port: number): Promise<WebSocketServer> => {
  return new Promise((resolve, reject) => {
    const wss = new WebSocketServer({ port, path: '/cap-console/logs' });

    const onListening = () => {
      wss.off('error', onError);
      resolve(wss);
    };
    const onError = (err: Error) => {
      wss.off('listening', onListening);
      reject(err);
    };

    wss.once('listening', onListening);
    wss.once('error', onError);
  });
};

const sendWelcomeMessage = (ws: WebSocket, req: IncomingMessage) => {
  const path = req.url;
  const remoteAddress = req.socket.remoteAddress;
  if (!path || !remoteAddress) {
    return;
  }

  const welcomeMessage = {
    path,
    data: {
      type: 'welcome',
      message: 'Welcome to CAP console plugin',
      path,
      remoteAddress,
      timestamp: new Date().toISOString(),
    },
  };

  ws.send(JSON.stringify(welcomeMessage));
};
