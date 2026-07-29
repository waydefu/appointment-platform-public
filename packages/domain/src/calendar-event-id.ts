import { DomainError } from './errors.js';
const ALPHABET = '0123456789abcdefghijklmnopqrstuv';
export const MIN_CALENDAR_EVENT_ID_LENGTH = 5;
export const MAX_CALENDAR_EVENT_ID_LENGTH = 1024;
const EVENT_ID_PATTERN = /^[0-9a-v]+$/;
function encodeBase32Hex(bytes: Uint8Array): string {
  let output = '';
  let buffer = 0;
  let bitsInBuffer = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bitsInBuffer += 8;
    while (bitsInBuffer >= 5) {
      bitsInBuffer -= 5;
      output += ALPHABET[(buffer >> bitsInBuffer) & 0b11111];
    }
  }
  if (bitsInBuffer > 0)
    output += ALPHABET[(buffer << (5 - bitsInBuffer)) & 0b11111];
  return output;
}
function decodeBase32Hex(text: string): Uint8Array {
  const bytes: number[] = [];
  let buffer = 0;
  let bitsInBuffer = 0;
  for (const character of text) {
    const value = ALPHABET.indexOf(character);
    if (value < 0)
      throw new DomainError(
        'INVALID_VALUE',
        `"${character}" is not a base32hex character.`
      );
    buffer = (buffer << 5) | value;
    bitsInBuffer += 5;
    if (bitsInBuffer >= 8) {
      bitsInBuffer -= 8;
      bytes.push((buffer >> bitsInBuffer) & 0xff);
    }
  }
  return Uint8Array.from(bytes);
}
export function toCalendarEventId(logicalKey: string): string {
  if (typeof logicalKey !== 'string' || logicalKey.length === 0)
    throw new DomainError(
      'INVALID_VALUE',
      'logicalKey must be a non-empty string.'
    );
  const eventId = encodeBase32Hex(new TextEncoder().encode(logicalKey));
  if (
    eventId.length < MIN_CALENDAR_EVENT_ID_LENGTH ||
    eventId.length > MAX_CALENDAR_EVENT_ID_LENGTH
  )
    throw new DomainError(
      'INVALID_VALUE',
      `A Calendar event ID must be ${MIN_CALENDAR_EVENT_ID_LENGTH}-${MAX_CALENDAR_EVENT_ID_LENGTH} characters; got ${eventId.length}.`
    );
  return eventId;
}
export function fromCalendarEventId(eventId: string): string {
  if (!isCalendarEventId(eventId))
    throw new DomainError(
      'INVALID_VALUE',
      'eventId is not a valid Calendar event ID.'
    );
  return new TextDecoder().decode(decodeBase32Hex(eventId));
}
export function isCalendarEventId(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    value.length >= MIN_CALENDAR_EVENT_ID_LENGTH &&
    value.length <= MAX_CALENDAR_EVENT_ID_LENGTH &&
    EVENT_ID_PATTERN.test(value)
  );
}
export function calendarEventIdForAppointment(appointmentId: string): string {
  return toCalendarEventId(`calendar_${appointmentId}`);
}
