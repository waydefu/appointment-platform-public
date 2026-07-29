import {
  assertReschedulable,
  assertTransitionAllowed,
  OPEN_STATUSES,
  type AppointmentStatusValue,
  type AppointmentTransition
} from './appointment-rules.js';
import {
  planAuditEvent,
  type AuditAction,
  type AuditContext,
  type AuditEvent
} from './audit.js';
import type {
  BookingKind,
  PatientBookingGuardSnapshot,
  SlotSnapshot
} from './booking-transaction.js';
import { calendarEventIdForAppointment } from './calendar-event-id.js';
import { DomainError } from './errors.js';
import {
  assertIdempotencyContext,
  planIdempotencyRecord,
  type IdempotencyContext,
  type PlannedIdempotencyRecord
} from './idempotency.js';
import { assertUtcTimestamp } from './timestamp.js';
export type { AppointmentStatusValue, AppointmentTransition };
export interface AppointmentSnapshot {
  readonly id: string;
  readonly slotId: string;
  readonly patientId: string;
  readonly bookingKind: BookingKind;
  readonly status: AppointmentStatusValue;
}
export interface TransitionRequest {
  readonly appointmentId: string;
  readonly transition: AppointmentTransition;
  readonly audit: AuditContext;
  readonly requestedAt: string;
  readonly idempotency: IdempotencyContext;
}
export interface RescheduleRequest {
  readonly appointmentId: string;
  readonly targetSlotId: string;
  readonly audit: AuditContext;
  readonly requestedAt: string;
  readonly idempotency: IdempotencyContext;
}
export interface DeleteAppointmentRequest {
  readonly appointmentId: string;
  readonly audit: AuditContext;
  readonly requestedAt: string;
  readonly idempotency: IdempotencyContext;
}
export type CalendarProjectionStatus = AppointmentStatusValue | 'deleted';
export interface PlannedOutboxEntry {
  readonly id: string;
  readonly type: 'calendar_projection_requested';
  readonly appointmentId: string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly appointmentStatus: CalendarProjectionStatus;
  readonly idempotencyKey: string;
  readonly status: 'pending';
  readonly attempts: 0;
  readonly createdAt: string;
  readonly nextAttemptAt: string;
}
export type PlannedPatientBookingGuardMutation =
  | {
      readonly action: 'release';
      readonly activeAppointmentId: string;
    }
  | {
      readonly action: 'retain';
      readonly guard: PatientBookingGuardSnapshot;
    };
export interface TransitionPlan {
  readonly appointmentId: string;
  readonly nextStatus: AppointmentStatusValue;
  readonly updatedAt: string;
  readonly completedAt?: string;
  readonly releaseSlotId?: string;
  readonly patientBookingGuard: PlannedPatientBookingGuardMutation;
  readonly auditEvent: AuditEvent;
  readonly outboxJob: PlannedOutboxEntry;
  readonly idempotencyRecord: PlannedIdempotencyRecord;
}
export interface DeletionPlan {
  readonly appointmentId: string;
  readonly deletedAt: string;
  readonly releaseSlotId?: string;
  readonly patientBookingGuard: PlannedPatientBookingGuardMutation;
  readonly auditEvent: AuditEvent;
  readonly outboxJob: PlannedOutboxEntry;
  readonly idempotencyRecord: PlannedIdempotencyRecord;
}
export interface ReschedulePlan {
  readonly appointmentId: string;
  readonly releaseSlotId: string;
  readonly reserveSlotId: string;
  readonly startsAt: string;
  readonly nextStatus: 'confirmed';
  readonly updatedAt: string;
  readonly patientBookingGuard: PlannedPatientBookingGuardMutation;
  readonly auditEvent: AuditEvent;
  readonly outboxJob: PlannedOutboxEntry;
  readonly idempotencyRecord: PlannedIdempotencyRecord;
}
const AUDIT_ACTIONS: Record<AppointmentTransition, AuditAction> = {
  request_cancellation: 'cancellation_requested',
  cancel: 'appointment_cancelled',
  complete: 'appointment_completed',
  no_show: 'appointment_no_show'
};
const NEXT_STATUS: Record<AppointmentTransition, AppointmentStatusValue> = {
  request_cancellation: 'cancellation_requested',
  cancel: 'cancelled',
  complete: 'completed',
  no_show: 'no_show'
};
function outboxFor(
  appointmentId: string,
  status: CalendarProjectionStatus,
  at: string,
  correlationId: string,
  causationId: string
): PlannedOutboxEntry {
  return {
    id: `outbox_${appointmentId}_${status}`,
    type: 'calendar_projection_requested',
    appointmentId,
    correlationId,
    causationId,
    appointmentStatus: status,
    idempotencyKey: calendarEventIdForAppointment(appointmentId),
    status: 'pending',
    attempts: 0,
    createdAt: at,
    nextAttemptAt: at
  };
}
function assertPatientBookingGuardOwnedBy(
  appointment: AppointmentSnapshot,
  guard: PatientBookingGuardSnapshot | undefined
): asserts guard is PatientBookingGuardSnapshot {
  if (guard === undefined || guard.activeAppointmentId !== appointment.id) {
    throw new DomainError(
      'PATIENT_BOOKING_GUARD_MISMATCH',
      'The patient booking guard does not belong to the appointment.'
    );
  }
}
export function planTransition(
  request: TransitionRequest,
  appointment: AppointmentSnapshot | undefined,
  patientBookingGuard: PatientBookingGuardSnapshot | undefined
): TransitionPlan {
  assertUtcTimestamp(request.requestedAt, 'requestedAt');
  assertIdempotencyContext(request.idempotency, request.audit.actorId);
  if (appointment === undefined) {
    throw new DomainError(
      'APPOINTMENT_NOT_FOUND',
      'The appointment does not exist.'
    );
  }
  assertTransitionAllowed(request.transition, appointment.status);
  assertPatientBookingGuardOwnedBy(appointment, patientBookingGuard);
  const nextStatus = NEXT_STATUS[request.transition];
  const releasesSlot =
    request.transition === 'cancel' || request.transition === 'no_show';
  const auditEvent = planAuditEvent({
    eventId: `audit_${appointment.id}_${nextStatus}`,
    occurredAt: request.requestedAt,
    action: AUDIT_ACTIONS[request.transition],
    resourceType: 'appointment',
    resourceId: appointment.id,
    before: {
      status: appointment.status,
      slotId: appointment.slotId
    },
    after: {
      status: nextStatus,
      slotId: appointment.slotId
    },
    context: request.audit
  });
  return {
    appointmentId: appointment.id,
    nextStatus,
    updatedAt: request.requestedAt,
    ...(request.transition === 'complete'
      ? { completedAt: request.requestedAt }
      : {}),
    ...(releasesSlot ? { releaseSlotId: appointment.slotId } : {}),
    patientBookingGuard:
      request.transition === 'request_cancellation'
        ? {
            action: 'retain',
            guard: {
              activeAppointmentId: appointment.id,
              status: 'cancellation_requested',
              updatedAt: request.requestedAt
            }
          }
        : {
            action: 'release',
            activeAppointmentId: appointment.id
          },
    auditEvent,
    outboxJob: outboxFor(
      appointment.id,
      nextStatus,
      request.requestedAt,
      request.audit.correlationId,
      auditEvent.eventId
    ),
    idempotencyRecord: planIdempotencyRecord(
      request.idempotency,
      appointment.id,
      request.requestedAt
    )
  };
}
export function planDeletion(
  request: DeleteAppointmentRequest,
  appointment: AppointmentSnapshot | undefined,
  patientBookingGuard: PatientBookingGuardSnapshot | undefined
): DeletionPlan {
  assertUtcTimestamp(request.requestedAt, 'requestedAt');
  assertIdempotencyContext(request.idempotency, request.audit.actorId);
  if (appointment === undefined) {
    throw new DomainError(
      'APPOINTMENT_NOT_FOUND',
      'The appointment does not exist.'
    );
  }
  if (request.audit.reasonCode === null) {
    throw new DomainError(
      'INVALID_VALUE',
      'Deleting an appointment requires a reason code.'
    );
  }
  const holdsSlot = OPEN_STATUSES.includes(appointment.status);
  if (holdsSlot) {
    assertPatientBookingGuardOwnedBy(appointment, patientBookingGuard);
  }
  const auditEvent = planAuditEvent({
    eventId: `audit_${appointment.id}_deleted`,
    occurredAt: request.requestedAt,
    action: 'appointment_deleted',
    resourceType: 'appointment',
    resourceId: appointment.id,
    before: {
      status: appointment.status,
      slotId: appointment.slotId
    },
    after: null,
    context: request.audit
  });
  return {
    appointmentId: appointment.id,
    deletedAt: request.requestedAt,
    ...(holdsSlot ? { releaseSlotId: appointment.slotId } : {}),
    patientBookingGuard: {
      action: 'release',
      activeAppointmentId: appointment.id
    },
    auditEvent,
    outboxJob: outboxFor(
      appointment.id,
      'deleted',
      request.requestedAt,
      request.audit.correlationId,
      auditEvent.eventId
    ),
    idempotencyRecord: planIdempotencyRecord(
      request.idempotency,
      appointment.id,
      request.requestedAt
    )
  };
}
export function planReschedule(
  request: RescheduleRequest,
  appointment: AppointmentSnapshot | undefined,
  targetSlot: SlotSnapshot | undefined,
  patientBookingGuard: PatientBookingGuardSnapshot | undefined
): ReschedulePlan {
  assertUtcTimestamp(request.requestedAt, 'requestedAt');
  assertIdempotencyContext(request.idempotency, request.audit.actorId);
  if (appointment === undefined) {
    throw new DomainError(
      'APPOINTMENT_NOT_FOUND',
      'The appointment does not exist.'
    );
  }
  assertReschedulable(
    appointment.status,
    appointment.slotId,
    targetSlot,
    appointment.bookingKind
  );
  assertPatientBookingGuardOwnedBy(appointment, patientBookingGuard);
  const auditEvent = planAuditEvent({
    eventId: `audit_${appointment.id}_rescheduled_${targetSlot.id}`,
    occurredAt: request.requestedAt,
    action: 'appointment_rescheduled',
    resourceType: 'appointment',
    resourceId: appointment.id,
    before: {
      status: appointment.status,
      slotId: appointment.slotId
    },
    after: {
      status: 'confirmed',
      slotId: targetSlot.id
    },
    context: request.audit
  });
  return {
    appointmentId: appointment.id,
    releaseSlotId: appointment.slotId,
    reserveSlotId: targetSlot.id,
    startsAt: targetSlot.startsAt,
    nextStatus: 'confirmed',
    updatedAt: request.requestedAt,
    patientBookingGuard: {
      action: 'retain',
      guard: {
        activeAppointmentId: appointment.id,
        status: 'confirmed',
        updatedAt: request.requestedAt
      }
    },
    auditEvent,
    outboxJob: {
      ...outboxFor(
        appointment.id,
        'confirmed',
        request.requestedAt,
        request.audit.correlationId,
        auditEvent.eventId
      ),
      id: `outbox_${appointment.id}_rescheduled_${targetSlot.id}`
    },
    idempotencyRecord: planIdempotencyRecord(
      request.idempotency,
      appointment.id,
      request.requestedAt
    )
  };
}
