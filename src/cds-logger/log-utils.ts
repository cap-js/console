import {
  DEFAULT_LOG_LEVEL,
  LOG_LEVEL_NAMES,
  LOG_LEVELS,
  type LogConfig,
  type LogLevel,
  type LogLevelNum,
  type LogOptions,
} from './cds-log-types.js';

export function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === 'string' && Object.keys(LOG_LEVELS).includes(value.toUpperCase());
}

export function isLogLevelNum(value: unknown): value is LogLevelNum {
  return typeof value === 'number' && Object.values(LOG_LEVELS).includes(value as LogLevelNum);
}

export function isLogConfig(obj: unknown): obj is LogConfig {
  return typeof obj === 'object' && obj !== null && ('level' in obj || 'label' in obj || 'prefix' in obj);
}

export function getLogLevelFromOptions(options?: LogOptions): LogLevel {
  if (options === undefined) {
    return DEFAULT_LOG_LEVEL;
  }
  if (isLogLevel(options)) {
    return options.toUpperCase() as LogLevel;
  }
  if (isLogLevelNum(options)) {
    return LOG_LEVEL_NAMES[options];
  }
  if (isLogConfig(options) && options.level !== undefined) {
    const level = options.level;

    if (isLogLevel(level)) {
      return level.toUpperCase() as LogLevel;
    }
    if (isLogLevelNum(level)) {
      return LOG_LEVEL_NAMES[level];
    }
  }

  return DEFAULT_LOG_LEVEL;
}
