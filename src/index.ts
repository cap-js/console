import { randomInt } from 'node:crypto';

import cds from '@sap/cds';

import { startWebSocketServerWithRetry } from './websocket/websocket-server.js';

const DEFAULT_PORT = 54953;
const MIN_PORT = 1024;
const MAX_PORT = 65535;
const RANDOM_PORTS_RETRIES = 10;

export const logger = cds.log('cap-console-plugin');

export default function main() {
  const portsToTry = [
    DEFAULT_PORT,
    ...Array.from({ length: RANDOM_PORTS_RETRIES }, () => randomInt(MIN_PORT, MAX_PORT)),
  ];

  startWebSocketServerWithRetry(portsToTry);
}
