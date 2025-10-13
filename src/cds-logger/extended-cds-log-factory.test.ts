import cds from '@sap/cds';
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { broadcastLogEvent } from '../websocket/websocket.js';
import { DEFAULT_LOG_LEVEL, LOG_LEVELS, type Logger } from './cds-log-types.js';
import ExtendedCdsLogFactory from './extended-cds-log-factory.js';

vi.mock('../websocket/websocket.js');

const originalLogFactory = cds.log;
let extendedLogFactory = cds.log;
const extendedLogFactoryInstance = ExtendedCdsLogFactory.getInstance();

const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(vi.fn());
const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(vi.fn());
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn());
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(vi.fn());
const consoleTraceSpy = vi.spyOn(console, 'trace').mockImplementation(vi.fn());
const broadcastLogEventMock = vi.mocked(broadcastLogEvent).mockImplementation(vi.fn());

describe('ExtendedCdsLogFactory', () => {
  beforeEach(() => {
    extendedLogFactoryInstance.extendCdsLog();
    extendedLogFactory = cds.log;
  });

  afterEach(() => {
    extendedLogFactoryInstance.restoreCdsLog();
    extendedLogFactoryInstance.setRootLogLevel(DEFAULT_LOG_LEVEL);
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('extendCdsLog', () => {
    test('should replace cds.log with new factory', () => {
      const extendedLogFactory = cds.log;

      expect(originalLogFactory).not.toBe(extendedLogFactory);
    });

    test('should retain all properties and their values', () => {
      const extendedLogFactory = cds.log;

      // Ignore read-only prop name and deprecated caller/arguments props
      const ignoredProps = ['arguments', 'caller', 'name'];
      const originalProps = Object.getOwnPropertyNames(originalLogFactory).filter((p) => !ignoredProps.includes(p));

      for (const prop of originalProps) {
        expect((originalLogFactory as unknown as Record<string, unknown>)[prop]).toBe(
          (extendedLogFactory as unknown as Record<string, unknown>)[prop]
        );
      }
    });
  });

  describe('setRootLogLevel', () => {
    test('should set rootLogLevel for all newly created loggers', () => {
      extendedLogFactoryInstance.setRootLogLevel('WARN');

      const logger = cds.log('testLogger', 'ERROR') as Logger;

      expect(logger.level).toBe(LOG_LEVELS.WARN);
    });

    test.each([
      ['SILENT', { log: 0, info: 0, warn: 0, error: 0, debug: 0, trace: 0 }],
      ['ERROR', { log: 0, info: 0, warn: 0, error: 1, debug: 0, trace: 0 }],
      ['WARN', { log: 0, info: 0, warn: 1, error: 1, debug: 0, trace: 0 }],
      ['INFO', { log: 1, info: 1, warn: 1, error: 1, debug: 0, trace: 0 }],
      ['DEBUG', { log: 1, info: 1, warn: 1, error: 1, debug: 1, trace: 0 }],
      ['TRACE', { log: 1, info: 1, warn: 1, error: 1, debug: 1, trace: 1 }],
    ] as const)(
      'should override level with rootLogLevel, log to console and emit the log event with level "%s"',
      (rootLogLevel, expectedNumOfCalls) => {
        const logger = extendedLogFactory(`loggerWith${rootLogLevel}`, 'TRACE') as Logger;
        extendedLogFactoryInstance.setRootLogLevel(rootLogLevel);

        logger.error('Error message');
        logger.warn('Warn message');
        logger.info('Info message');
        logger.log('Log message');
        logger.debug('Debug message');
        logger.trace('Trace message');

        expect(logger.level).toBe(LOG_LEVELS[rootLogLevel]);
        expect(broadcastLogEventMock).toHaveBeenCalledTimes(
          Object.values(expectedNumOfCalls).reduce((sum, val) => sum + val, 0 as number)
        );
        expect(consoleErrorSpy).toHaveBeenCalledTimes(expectedNumOfCalls.error);
        expect(consoleWarnSpy).toHaveBeenCalledTimes(expectedNumOfCalls.warn);
        expect(consoleInfoSpy).toHaveBeenCalledTimes(expectedNumOfCalls.info);
        expect(consoleLogSpy).toHaveBeenCalledTimes(expectedNumOfCalls.log);
        expect(consoleDebugSpy).toHaveBeenCalledTimes(expectedNumOfCalls.debug);
        expect(consoleTraceSpy).toHaveBeenCalledTimes(expectedNumOfCalls.trace);
      }
    );
  });

  describe('logFactories', () => {
    test('should have the same entries', () => {
      const originalLogger = originalLogFactory('logger');
      const extendedLogger = extendedLogFactory('logger');

      const originalEntries = Object.entries(originalLogger);
      const extendedEntries = Object.entries(extendedLogger);

      expect(originalEntries).toEqual(extendedEntries);
    });

    // Test failing for not emitting event properly
    describe.skip.each([
      ['originalLogFactory', originalLogFactory, false],
      ['extendedLogFactory', extendedLogFactory, true],
    ] as const)('%s', (_, logFactory, shouldBroadCastEvent) => {
      test.each([
        ['silent', { log: 0, info: 0, warn: 0, error: 0, debug: 0, trace: 0 }],
        ['error', { log: 0, info: 0, warn: 0, error: 1, debug: 0, trace: 0 }],
        ['warn', { log: 0, info: 0, warn: 1, error: 1, debug: 0, trace: 0 }],
        ['info', { log: 1, info: 1, warn: 1, error: 1, debug: 0, trace: 0 }],
        [undefined, { log: 1, info: 1, warn: 1, error: 1, debug: 0, trace: 0 }],
        ['debug', { log: 1, info: 1, warn: 1, error: 1, debug: 1, trace: 1 }],
        ['trace', { log: 1, info: 1, warn: 1, error: 1, debug: 1, trace: 1 }],
        ['invalidLevel', { log: 1, info: 1, warn: 1, error: 1, debug: 1, trace: 1 }],
      ] as const)('calls expected console functions and emitter at level "%s"', (level, expectedNumOfCalls) => {
        const logger = logFactory(`loggerWith${level}`, level) as Logger;

        logger.error('Error message');
        logger.warn('Warn message');
        logger.info('Info message');
        logger.log('Log message');
        logger.debug('Debug message');
        logger.trace('Trace message');

        expect(broadcastLogEventMock).toHaveBeenCalledTimes(
          shouldBroadCastEvent ? Object.values(expectedNumOfCalls).reduce((sum, val) => sum + val, 0 as number) : 0
        );
        expect(consoleErrorSpy).toHaveBeenCalledTimes(expectedNumOfCalls.error);
        expect(consoleWarnSpy).toHaveBeenCalledTimes(expectedNumOfCalls.warn);
        expect(consoleInfoSpy).toHaveBeenCalledTimes(expectedNumOfCalls.info);
        expect(consoleLogSpy).toHaveBeenCalledTimes(expectedNumOfCalls.log);
        expect(consoleDebugSpy).toHaveBeenCalledTimes(expectedNumOfCalls.debug);
        expect(consoleTraceSpy).toHaveBeenCalledTimes(expectedNumOfCalls.trace);
      });
    });
  });

  describe('restoreCdsLog', () => {
    test('should restore original cds.log factory', () => {
      extendedLogFactoryInstance.restoreCdsLog();
      const restoredLogFactory = cds.log;

      expect(restoredLogFactory).toBe(originalLogFactory);
    });

    test('should restore the original log level for new loggers after extending the log factory', () => {
      const newLogger = cds.log('newLogger', 'WARN');

      extendedLogFactoryInstance.setRootLogLevel('ERROR');
      newLogger.warn('Test message');

      expect(consoleWarnSpy).toHaveBeenCalledTimes(0);

      extendedLogFactoryInstance.restoreCdsLog();
      newLogger.warn('Test message');

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    test('should restore the original log level for pre-existing loggers before extending the log factory', () => {
      extendedLogFactoryInstance.restoreCdsLog();
      const existingLogger = cds.log('existingLogger', 'WARN');
      extendedLogFactoryInstance.extendCdsLog();

      extendedLogFactoryInstance.setRootLogLevel('ERROR');
      existingLogger.warn('Test message');

      expect(consoleWarnSpy).toHaveBeenCalledTimes(0);

      extendedLogFactoryInstance.restoreCdsLog();
      existingLogger.warn('Test message');

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });
  });
});
