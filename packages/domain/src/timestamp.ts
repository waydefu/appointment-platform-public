import { DomainError } from './errors.js';
const UTC_ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
export function isUtcIsoTimestamp(value: string): boolean {
  if (!UTC_ISO_8601.test(value)) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value.slice(0, 10);
}
export function assertUtcTimestamp(value: string, fieldName: string): void {
  if (!isUtcIsoTimestamp(value)) {
    throw new DomainError(
      'INVALID_TIMESTAMP',
      `${fieldName} must be a valid UTC ISO-8601 timestamp.`
    );
  }
}
