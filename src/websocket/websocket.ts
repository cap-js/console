import type { WebSocket } from 'ws';

import ExtendedCdsLogFactory from '../cds-logger/extended-cds-log-factory.js';
import { logger } from '../index.js';
import { LoggingUpdateSchema } from './schema.js';

interface LogEvent {
  path: string;
  data: {
    level: string;
    logger: string;
    thread: string;
    type: string;
    message: Array<unknown>;
    ts: number;
  };
}

const extendedCdsLogFactory = ExtendedCdsLogFactory.getInstance();
const openWebsocketConnections = new Set<WebSocket>();

export const registerWebsocketHandlers = (ws: WebSocket) => {
  handleConnectionOpen(ws);
  ws.on('message', handleMessage);
  ws.on('close', () => {
    handleConnectionClose(ws);
  });
};

export function broadcastLogEvent(logEvent: LogEvent) {
  let payload: string;

  try {
    payload = JSON.stringify(logEvent);
  } catch (error) {
    logger.error('Failed to serialize log event:', error);

    return;
  }

  openWebsocketConnections.forEach((ws) => {
    try {
      ws.send(payload);
    } catch (error) {
      logger.error('Failed to broadcast message:', error);
    }
  });
}

const handleMessage = (message: Buffer) => {
  const parsedJson = JSON.parse(message.toString());
  const validatedMessage = LoggingUpdateSchema.safeParse(parsedJson);

  if (!validatedMessage.success) {
    return;
  }

  const loggers = validatedMessage.data.data.loggers;
  loggers.forEach((logger) => {
    if (logger.logger === 'root') {
      extendedCdsLogFactory.setRootLogLevel(logger.level);
    }
  });
};

const handleConnectionOpen = (ws: WebSocket) => {
  if (openWebsocketConnections.size === 0) {
    extendedCdsLogFactory.extendCdsLog();
  }

  openWebsocketConnections.add(ws);
};

const handleConnectionClose = (ws: WebSocket) => {
  openWebsocketConnections.delete(ws);

  if (openWebsocketConnections.size === 0) {
    extendedCdsLogFactory.restoreCdsLog();
  }
};
