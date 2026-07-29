import type { BookingKind, SlotSnapshot } from './booking-transaction.js';
import { ACTIVE_BOOKING_LIMIT } from './booking-transaction.js';
import { DomainError } from './errors.js';
export type AppointmentTransition =
  'request_cancellation' | 'cancel' | 'complete' | 'no_show';
export type AppointmentStatusValue =
  | 'confirmed'
  | 'cancellation_requested'
  | 'cancelled'
  | 'completed'
  | 'no_show';
export const OPEN_STATUSES: readonly AppointmentStatusValue[] = [
  'confirmed',
  'cancellation_requested'
];
const ALLOWED_FROM: Record<
  AppointmentTransition,
  readonly AppointmentStatusValue[]
> = {
  request_cancellation: ['confirmed'],
  complete: ['confirmed'],
  cancel: OPEN_STATUSES,
  no_show: OPEN_STATUSES
};
export function assertSlotBookable(
  slot: SlotSnapshot | undefined,
  bookingKind: BookingKind
): asserts slot is SlotSnapshot {
  if (slot === undefined || slot.reservationId !== undefined) {
    throw new DomainError(
      'SLOT_UNAVAILABLE',
      'The slot does not exist or is already reserved.'
    );
  }
  if (slot.kind !== bookingKind) {
    throw new DomainError(
      'BOOKING_KIND_MISMATCH',
      'The slot belongs to a different booking kind.'
    );
  }
}
export function assertWithinActiveBookingLimit(activeCount: number): void {
  if (activeCount >= ACTIVE_BOOKING_LIMIT) {
    throw new DomainError(
      'DUPLICATE_ACTIVE_BOOKING',
      'The patient already has an active booking.'
    );
  }
}
export function assertTransitionAllowed(
  transition: AppointmentTransition,
  status: AppointmentStatusValue
): void {
  if (!ALLOWED_FROM[transition].includes(status)) {
    throw new DomainError(
      'TRANSITION_NOT_ALLOWED',
      `An appointment in status "${status}" cannot be ${transition}.`
    );
  }
}
export function assertReschedulable(
  currentStatus: AppointmentStatusValue,
  currentSlotId: string,
  targetSlot: SlotSnapshot | undefined,
  bookingKind: BookingKind
): asserts targetSlot is SlotSnapshot {
  if (!OPEN_STATUSES.includes(currentStatus)) {
    throw new DomainError(
      'TRANSITION_NOT_ALLOWED',
      'Only an appointment that has not finished can be rescheduled.'
    );
  }
  if (targetSlot === undefined || targetSlot.reservationId !== undefined) {
    throw new DomainError(
      'SLOT_UNAVAILABLE',
      'The target slot is not available.'
    );
  }
  if (targetSlot.id === currentSlotId) {
    throw new DomainError(
      'INVALID_VALUE',
      'The target slot is the appointment’s current slot.'
    );
  }
  if (targetSlot.kind !== bookingKind) {
    throw new DomainError(
      'BOOKING_KIND_MISMATCH',
      'A rescheduled slot must keep the original booking kind.'
    );
  }
}
