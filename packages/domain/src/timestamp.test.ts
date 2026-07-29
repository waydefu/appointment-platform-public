import { describe, expect, it } from 'vitest';
import { DomainError } from './errors.js';
import { assertUtcTimestamp, isUtcIsoTimestamp } from './timestamp.js';
const accepted = [
  '2030-07-25T10:00:00Z',
  '2030-07-25T10:00:00.000Z',
  '2030-07-25T10:00:00.123456Z',
  '2028-02-29T00:00:00Z'
];
const rejected: ReadonlyArray<[string, string]> = [
  ['legacy Date.parse 格式', 'Jul 25 2026 Z'],
  ['本地時間，沒有時區', '2030-07-25T10:00:00'],
  ['帶偏移而非 UTC', '2030-07-25T10:00:00+08:00'],
  ['缺秒', '2030-07-25T10:00Z'],
  ['月份越界', '2030-13-01T00:00:00Z'],
  ['小時越界', '2030-07-25T25:00:00Z'],
  ['日期溢位', '2030-02-31T00:00:00Z'],
  ['非閏年的 2 月 29 日', '2030-02-29T00:00:00Z'],
  ['只有日期', '2030-07-25'],
  ['空字串', '']
];
describe('isUtcIsoTimestamp', () => {
  it.each(accepted)('accepts %s', (value) => {
    expect(isUtcIsoTimestamp(value)).toBe(true);
  });
  it.each(rejected)('rejects %s', (_label, value) => {
    expect(isUtcIsoTimestamp(value)).toBe(false);
  });
});
describe('assertUtcTimestamp', () => {
  it('passes a valid timestamp through', () => {
    expect(() =>
      assertUtcTimestamp('2030-07-25T10:00:00.000Z', 'startsAt')
    ).not.toThrow();
  });
  it('raises INVALID_TIMESTAMP naming the field', () => {
    expect(() => assertUtcTimestamp('Jul 25 2026 Z', 'startsAt')).toThrow(
      DomainError
    );
    try {
      assertUtcTimestamp('Jul 25 2026 Z', 'startsAt');
      expect.unreachable('assertUtcTimestamp should have thrown.');
    } catch (error) {
      expect((error as DomainError).code).toBe('INVALID_TIMESTAMP');
      expect((error as DomainError).message).toBe(
        'startsAt must be a valid UTC ISO-8601 timestamp.'
      );
    }
  });
});
