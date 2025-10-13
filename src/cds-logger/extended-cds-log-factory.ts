import cds from '@sap/cds';

import { broadcastLogEvent } from '../websocket/websocket.js';
import {
  DEFAULT_LOG_LEVEL,
  LOG_LEVEL_NAMES,
  LOG_LEVELS,
  type LogFactory,
  type LogFn,
  type LogFns,
  type Logger,
  type LogLevel,
  type LogOptions,
} from './cds-log-types.js';
import { getLogLevelFromOptions, isLogConfig } from './log-utils.js';

const noop = () => {
  /* noop function, in case log level is not set */
};

export default class ExtendedCdsLogFactory {
  private static instance: ExtendedCdsLogFactory;
  private originalLogFactory: LogFactory;
  private rootLogLevel = DEFAULT_LOG_LEVEL;
  private originalLogLevels = new Map<string, LogLevel>();

  private constructor() {
    this.originalLogFactory = cds.log as unknown as LogFactory;
  }

  public static getInstance(): ExtendedCdsLogFactory {
    if (!ExtendedCdsLogFactory.instance) {
      ExtendedCdsLogFactory.instance = new ExtendedCdsLogFactory();
    }

    return ExtendedCdsLogFactory.instance;
  }

  /*
   * Sets the root log level and reapplies it to all existing loggers
   */
  public setRootLogLevel(newLogLevel: LogLevel) {
    this.rootLogLevel = newLogLevel;

    const loggerIds = Object.values((cds.log as unknown as LogFactory).loggers);
    loggerIds.forEach((logger) => {
      this.extendedLogFactory(logger.id, logger.level);
    });
  }

  /*
   * This method overrides the cds.log factory and replaces it with extendedLogFactory method
   * while still keeping most of the properties the same
   */
  public extendCdsLog() {
    Object.values(this.originalLogFactory.loggers).forEach((logger) => {
      this.originalLogLevels.set(logger.id, LOG_LEVEL_NAMES[logger.level]);
    });
    const extendedLogFactory = Object.assign(this.extendedLogFactory, this.originalLogFactory);
    extendedLogFactory.prototype = this.originalLogFactory.prototype;

    cds.log = extendedLogFactory as unknown as typeof cds.log;

    const loggerIds = Object.values((cds.log as unknown as LogFactory).loggers);
    loggerIds.forEach((logger) => {
      this.extendedLogFactory(logger.id);
    });
  }

  public restoreCdsLog() {
    cds.log = this.originalLogFactory as unknown as typeof cds.log;
    this.originalLogLevels.forEach((level, loggerId) => {
      cds.log(loggerId, level);
    });

    Object.values(this.originalLogFactory.loggers).forEach((logger) => {
      const originals = logger.__originalLogFns;
      if (originals) {
        logger.error = originals.error;
        logger.warn = originals.warn;
        logger.log = originals.log;
        logger.info = originals.info;
        logger.debug = originals.debug;
        logger.trace = originals.trace;

        delete logger.__originalLogFns;
      }
    });

    this.originalLogLevels.clear();
  }

  private extendedLogFactory = (loggerId: string, options?: LogOptions, useRootLogLevel = true): Logger => {
    const optionsLevel = getLogLevelFromOptions(options);

    this.originalLogLevels.set(loggerId, optionsLevel);
    const effectiveLevel = useRootLogLevel ? this.rootLogLevel : optionsLevel;

    const newOptions = {
      level: LOG_LEVELS.TRACE, // Always use TRACE to properly construct all original LogFns
      label: isLogConfig(options) ? options.label : undefined,
      prefix: isLogConfig(options) ? options.prefix : undefined,
    };
    const logger = this.originalLogFactory(loggerId, newOptions);

    if (!logger.__originalLogFns) {
      Object.defineProperty(logger, '__originalLogFns', {
        value: {
          error: logger.error,
          warn: logger.warn,
          log: logger.log,
          info: logger.info,
          debug: logger.debug,
          trace: logger.trace,
        } satisfies LogFns,
        enumerable: false,
        configurable: true,
        writable: false,
      });
    }

    const loglevelNum = LOG_LEVELS[effectiveLevel];
    const originalFns = logger.__originalLogFns;
    if (originalFns) {
      logger.level = loglevelNum;
      logger.error = loglevelNum >= LOG_LEVELS.ERROR ? this.extendLog(loggerId, originalFns.error, 'ERROR') : noop;
      logger.warn = loglevelNum >= LOG_LEVELS.WARN ? this.extendLog(loggerId, originalFns.warn, 'WARN') : noop;
      logger.log = loglevelNum >= LOG_LEVELS.INFO ? this.extendLog(loggerId, originalFns.log, 'INFO') : noop;
      logger.info = loglevelNum >= LOG_LEVELS.INFO ? this.extendLog(loggerId, originalFns.info, 'INFO') : noop;
      logger.debug = loglevelNum >= LOG_LEVELS.DEBUG ? this.extendLog(loggerId, originalFns.debug, 'DEBUG') : noop;
      logger.trace = loglevelNum >= LOG_LEVELS.TRACE ? this.extendLog(loggerId, originalFns.trace, 'TRACE') : noop;

      logger._error = loglevelNum >= LOG_LEVELS.ERROR;
      logger._warn = loglevelNum >= LOG_LEVELS.WARN;
      logger._info = loglevelNum >= LOG_LEVELS.INFO;
      logger._debug = loglevelNum >= LOG_LEVELS.DEBUG;
      logger._trace = loglevelNum >= LOG_LEVELS.TRACE;
    }

    return logger;
  };

  private extendLog(loggerId: string, originalLogFn: LogFn, logLevel: LogLevel) {
    return async (...args: Array<unknown>) => {
      originalLogFn(...args);

      const logEvent = {
        path: '/cap-console/logs',
        data: {
          level: logLevel,
          logger: loggerId,
          thread: 'not-supported',
          type: 'log',
          message: args,
          ts: Date.now(),
        },
      };

      broadcastLogEvent(logEvent);
    };
  }
}
