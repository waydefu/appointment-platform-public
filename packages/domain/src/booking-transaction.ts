import {
  assertSlotBookable,
  assertWithinActiveBookingLimit
} from './appointment-rules.js';
import { planAuditEvent, type AuditContext, type AuditEvent } from './audit.js';
import { calendarEventIdForAppointment } from './calendar-event-id.js';
import { DomainError } from './errors.js';
import {
  assertIdempotencyContext,
  planIdempotencyRecord,
  type IdempotencyContext,
  type PlannedIdempotencyRecord
} from './idempotency.js';
import { assertUtcTimestamp } from './timestamp.js';
export type BookingKind = 'initial' | 'follow_up';
export const ACTIVE_BOOKING_LIMIT = 1;
export const ACTIVE_BOOKING_STATUSES: readonly string[] = [
  'confirmed',
  'cancellation_requested'
];
export interface SlotSnapshot {
  readonly id: string;
  readonly kind: BookingKind;
  readonly startsAt: string;
  readonly reservationId?: string;
}
export type PatientBookingGuardStatus = 'confirmed' | 'cancellation_requested';
export interface PatientBookingGuardSnapshot {
  readonly activeAppointmentId: string;
  readonly status: PatientBookingGuardStatus;
  readonly updatedAt: string;
}
export interface BookingRequest {
  readonly appointmentId: string;
  readonly slotId: string;
  readonly patientId: string;
  readonly bookingKind: BookingKind;
  readonly itemId: string;
  readonly audit: AuditContext;
  readonly requestedAt: string;
  readonly idempotency: IdempotencyContext;
}
export interface PlannedAppointment {
  readonly id: string;
  readonly slotId: string;
  readonly startsAt: string;
  readonly patientId: string;
  readonly bookingKind: BookingKind;
  readonly itemId: string;
  readonly status: 'confirmed';
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface PlannedOutboxJob {
  readonly id: string;
  readonly type: 'calendar_projection_requested';
  readonly appointmentId: string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly appointmentStatus: 'confirmed';
  readonly idempotencyKey: string;
  readonly status: 'pending';
  readonly attempts: 0;
  readonly createdAt: string;
  readonly nextAttemptAt: string;
}
export interface BookingPlan {
  readonly appointment: PlannedAppointment;
  readonly slotReservation: {
    readonly slotId: string;
    readonly reservationId: string;
  };
  readonly patientBookingGuard: PatientBookingGuardSnapshot;
  readonly auditEvent: AuditEvent;
  readonly outboxJob: PlannedOutboxJob;
  readonly idempotencyRecord: PlannedIdempotencyRecord;
}
function assertIdentifier(value: string, fieldName: string): void {
  if (!/^[A-Za-z0-9_:-]{1,128}$/.test(value)) {
    throw new DomainError(
      'INVALID_VALUE',
      `${fieldName} must be an opaque identifier.`
    );
  }
}
export function planBooking(
  request: BookingRequest,
  slot: SlotSnapshot | undefined,
  patientBookingGuard: PatientBookingGuardSnapshot | undefined
): BookingPlan {
  assertIdentifier(request.appointmentId, 'appointmentId');
  assertIdentifier(request.patientId, 'patientId');
  assertUtcTimestamp(request.requestedAt, 'requestedAt');
  assertIdempotencyContext(request.idempotency, request.audit.actorId);
  if (slot !== undefined && slot.id !== request.slotId) {
    throw new DomainError(
      'INVALID_VALUE',
      'The slot does not match the request.'
    );
  }
  assertSlotBookable(slot, request.bookingKind);
  assertWithinActiveBookingLimit(patientBookingGuard === undefined ? 0 : 1);
  const appointment: PlannedAppointment = {
    id: request.appointmentId,
    slotId: slot.id,
    startsAt: slot.startsAt,
    patientId: request.patientId,
    bookingKind: request.bookingKind,
    itemId: request.itemId,
    status: 'confirmed',
    createdAt: request.requestedAt,
    updatedAt: request.requestedAt
  };
  const auditEvent = planAuditEvent({
    eventId: `audit_${request.appointmentId}_confirmed`,
    occurredAt: request.requestedAt,
    action: 'appointment_confirmed',
    resourceType: 'appointment',
    resourceId: request.appointmentId,
    before: null,
    after: {
      status: 'confirmed',
      slotId: slot.id
    },
    context: request.audit
  });
  return {
    appointment,
    slotReservation: {
      slotId: slot.id,
      reservationId: request.appointmentId
    },
    patientBookingGuard: {
      activeAppointmentId: request.appointmentId,
      status: 'confirmed',
      updatedAt: request.requestedAt
    },
    auditEvent,
    outboxJob: {
      id: `outbox_${request.appointmentId}_confirmed`,
      type: 'calendar_projection_requested',
      appointmentId: request.appointmentId,
      correlationId: request.audit.correlationId,
      causationId: auditEvent.eventId,
      appointmentStatus: 'confirmed',
      idempotencyKey: calendarEventIdForAppointment(request.appointmentId),
      status: 'pending',
      attempts: 0,
      createdAt: request.requestedAt,
      nextAttemptAt: request.requestedAt
    },
    idempotencyRecord: planIdempotencyRecord(
      request.idempotency,
      request.appointmentId,
      request.requestedAt
    )
  };
}
