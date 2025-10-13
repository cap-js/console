const LOG_LEVELS = {
  SILENT: 0, // all log output switched off
  ERROR: 1, // logs errors only
  WARN: 2, // logs errors and warnings only
  INFO: 3, // logs errors, warnings and general infos
  DEBUG: 4, // logs errors, warnings, info, and debug
  TRACE: 5, // most detailed log level
  SILLY: 5, // alias for TRACE
  VERBOSE: 5, // alias for TRACE
} as const;

const LOG_LEVEL_NAMES = {
  0: 'SILENT',
  1: 'ERROR',
  2: 'WARN',
  3: 'INFO',
  4: 'DEBUG',
  5: 'TRACE',
} as const;

const DEFAULT_LOG_LEVEL: LogLevel = 'INFO';

type LogLevel = keyof typeof LOG_LEVELS;
type LogLevelNum = (typeof LOG_LEVELS)[LogLevel];

type FormatterFn = (label: string, level: number, ...args: Array<unknown>) => Array<unknown>;

type LogFn = (...args: Array<unknown>) => void;

interface LogFns {
  error: LogFn;
  warn: LogFn;
  log: LogFn;
  info: LogFn;
  debug: LogFn;
  trace: LogFn;
}

type Flatten<T> = T extends (...args: infer A) => infer R
  ? ((...args: A) => R) & { [K in keyof T]: T[K] }
  : { [K in keyof T]: T[K] };

type Logger = Flatten<
  LogFn &
    LogFns & {
      format: FormatterFn;
      setFormat: (fn: FormatterFn) => Logger;

      _debug: boolean;
      _error: boolean;
      _info: boolean;
      _trace: boolean;
      _warn: boolean;

      id: string;
      label: string;
      level: LogLevelNum;

      __originalLogFns?: LogFns;
    }
>;

interface LogConfig {
  level?: LogLevel | LogLevelNum;
  label?: string;
  prefix?: string;
}
type LogOptions = LogLevel | LogLevelNum | LogConfig;

type LogFactoryFn = (module?: string, options?: LogOptions) => Logger;

type LoggerMethods = Pick<Logger, 'format' | 'trace' | 'debug' | 'log' | 'info' | 'warn' | 'error'>;

type LoggerConstructor = (label: string, level: LogLevelNum) => LoggerMethods;

interface LogFactoryProperties {
  loggers: Record<string, Logger>;
  levels: typeof LOG_LEVELS;
  format: FormatterFn;
  formatters: Record<string, FormatterFn>;
  Logger: LoggerConstructor;
  winstonLogger: (options: unknown) => LoggerConstructor;
  debug: (module?: string, options?: LogOptions) => unknown;
}

type LogFactory = LogFactoryFn & LogFactoryProperties;

type ExtendedLogFactoryFn = (module?: string, options?: LogOptions, useRootLogLevel?: boolean) => Logger;

type ExtendedLogFactory = ExtendedLogFactoryFn & LogFactoryProperties;

export { DEFAULT_LOG_LEVEL, LOG_LEVEL_NAMES, LOG_LEVELS };
export type { ExtendedLogFactory, LogConfig, LogFactory, LogFn, LogFns, Logger, LogLevel, LogLevelNum, LogOptions };
