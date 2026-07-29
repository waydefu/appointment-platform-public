import { describe, expect, it } from 'vitest';
import { UtcIsoTimestampSchema } from './index.js';
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
describe('UtcIsoTimestampSchema', () => {
  it.each(accepted)('accepts %s', (value) => {
    expect(UtcIsoTimestampSchema.safeParse(value).success).toBe(true);
  });
  it.each(rejected)('rejects %s', (_label, value) => {
    expect(UtcIsoTimestampSchema.safeParse(value).success).toBe(false);
  });
  it('round-trips every accepted value through Date unchanged', () => {
    for (const value of accepted) {
      const parsed = new Date(value);
      expect(parsed.toISOString().slice(0, 10)).toBe(value.slice(0, 10));
    }
  });
});
