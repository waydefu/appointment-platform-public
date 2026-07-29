import type { AppointmentStatusValue } from './appointment-rules.js';
import { DomainError } from './errors.js';
import { assertUtcTimestamp } from './timestamp.js';

export const AUDIT_SCHEMA_VERSION = 1 as const;

export type AuditAction =
  | 'appointment_confirmed'
  | 'cancellation_requested'
  | 'appointment_cancelled'
  | 'appointment_completed'
  | 'appointment_no_show'
  | 'appointment_rescheduled'
  | 'appointment_deleted';

export type AuditSource = 'api' | 'system' | 'worker';

export interface AuditContext {
  readonly actorId: string;
  readonly actorRole: string;
  readonly correlationId: string;
  readonly source: AuditSource;
  readonly reasonCode: string | null;
  readonly policyVersion: string | null;
}

export interface AuditAppointmentState {
  readonly status: AppointmentStatusValue;
  readonly slotId: string;
}

export interface AuditEvent {
  readonly eventId: string;
  readonly occurredAt: string;
  readonly actorId: string;
  readonly actorRole: string;
  readonly action: AuditAction;
  readonly resourceType: 'appointment';
  readonly resourceId: string;
  readonly before: AuditAppointmentState | null;
  readonly after: AuditAppointmentState | null;
  readonly reasonCode: string | null;
  readonly result: 'succeeded';
  readonly correlationId: string;
  readonly source: AuditSource;
  readonly policyVersion: string | null;
  readonly schemaVersion: typeof AUDIT_SCHEMA_VERSION;
}

interface PlanAuditEventInput {
  readonly eventId: string;
  readonly occurredAt: string;
  readonly action: AuditAction;
  readonly resourceType: 'appointment';
  readonly resourceId: string;
  readonly before: AuditAppointmentState | null;
  readonly after: AuditAppointmentState | null;
  readonly context: AuditContext;
}

function assertOpaqueIdentifier(value: string, fieldName: string): void {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new DomainError(
      'INVALID_VALUE',
      `${fieldName} must be an opaque identifier.`
    );
  }
}

function assertAuditEventId(value: string): void {
  if (!/^[A-Za-z0-9_-]{1,512}$/.test(value)) {
    throw new DomainError(
      'INVALID_VALUE',
      'audit.eventId must be an opaque identifier.'
    );
  }
}

function assertNullableOpaqueIdentifier(
  value: string | null,
  fieldName: string
): void {
  if (value !== null) assertOpaqueIdentifier(value, fieldName);
}

export function planAuditEvent(input: PlanAuditEventInput): AuditEvent {
  assertAuditEventId(input.eventId);
  assertOpaqueIdentifier(input.resourceId, 'audit.resourceId');
  assertOpaqueIdentifier(input.context.actorId, 'audit.actorId');
  assertOpaqueIdentifier(input.context.actorRole, 'audit.actorRole');
  assertOpaqueIdentifier(input.context.correlationId, 'audit.correlationId');
  assertNullableOpaqueIdentifier(input.context.reasonCode, 'audit.reasonCode');
  assertNullableOpaqueIdentifier(
    input.context.policyVersion,
    'audit.policyVersion'
  );
  assertUtcTimestamp(input.occurredAt, 'audit.occurredAt');

  return {
    eventId: input.eventId,
    occurredAt: input.occurredAt,
    actorId: input.context.actorId,
    actorRole: input.context.actorRole,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    before: input.before,
    after: input.after,
    reasonCode: input.context.reasonCode,
    result: 'succeeded',
    correlationId: input.context.correlationId,
    source: input.context.source,
    policyVersion: input.context.policyVersion,
    schemaVersion: AUDIT_SCHEMA_VERSION
  };
}
