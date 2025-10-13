import { describe, expect, test } from 'vitest';

import { DEFAULT_LOG_LEVEL } from './cds-log-types';
import { getLogLevelFromOptions, isLogConfig, isLogLevel, isLogLevelNum } from './log-utils';

describe('isLogLevel', () => {
  test.each([
    ['INFO', true],
    ['error', true],
    ['debug', true],
    ['INVALID', false],
    ['', false],
    [3, false],
    [null, false],
    [undefined, false],
  ])('should return %s for input %p', (input, expected) => {
    expect(isLogLevel(input)).toBe(expected);
  });
});

describe('isLogLevelNum', () => {
  test.each([
    [0, true],
    [3, true],
    [5, true],
    [6, false],
    [-1, false],
    ['INFO', false],
    [null, false],
  ])('should return %s for input %p', (input, expected) => {
    expect(isLogLevelNum(input)).toBe(expected);
  });
});

describe('isLogConfig', () => {
  test.each([
    [{ level: 'INFO' }, true],
    [{ label: 'test' }, true],
    [{ prefix: '>>' }, true],
    [{}, false],
    [{ foo: 'bar' }, false],
    [null, false],
    ['INFO', false],
  ])('should return %s for input %p', (input, expected) => {
    expect(isLogConfig(input)).toBe(expected);
  });
});

describe('getLogLevelFromOptions', () => {
  test.each([
    ['INFO', 'INFO'],
    ['error', 'ERROR'],
    [0, 'SILENT'],
    [3, 'INFO'],
    [{ invalid: 'INVALID' }, DEFAULT_LOG_LEVEL],
    [{ level: 'DEBUG' }, 'DEBUG'],
    [{ level: 2 }, 'WARN'],
    [{ level: 'INVALID' }, DEFAULT_LOG_LEVEL],
    [undefined, DEFAULT_LOG_LEVEL],
    ['INVALID', DEFAULT_LOG_LEVEL],
  ])('should return %s for input %p', (input, expected) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing that it works for invalid inputs
    expect(getLogLevelFromOptions(input as any)).toBe(expected);
  });
});
