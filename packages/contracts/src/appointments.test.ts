import { describe, expect, it } from 'vitest';
import {
  ApiErrorCodeSchema,
  ApiErrorResponseSchema,
  CreateAppointmentRequestSchema,
  DeleteAppointmentReasonSchema,
  DeleteAppointmentRequestSchema,
  DeleteAppointmentResponseSchema,
  HealthResponseSchema,
  RescheduleAppointmentRequestSchema,
  RescheduleAppointmentResponseSchema,
  STAFF_TRANSITION_TO_DOMAIN,
  StaffAppointmentTransitionSchema,
  TransitionAppointmentRequestSchema,
  TransitionAppointmentResponseSchema
} from './index.js';
const unapprovedFields: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['unapproved email', { email: 'person@example.invalid' }],
  ['patient profile', { patient: { fullName: 'PRIVATE_FIELD_SENTINEL_NAME' } }],
  ['client actor', { actorId: 'front_desk_001' }],
  ['client role', { role: 'admin' }],
  ['client patient id', { patientId: 'patient_001' }],
  ['client time', { requestedAt: '2030-07-20T09:00:00.000Z' }],
  ['free text', { notes: 'This field must not be collected.' }]
];
describe('v1 API contracts', () => {
  it('accepts only the appointment command fields', () => {
    expect(
      CreateAppointmentRequestSchema.parse({
        idempotencyKey: 'booking_request_0001',
        slotId: 'slot-001',
        serviceId: 'service-001',
        bookingKind: 'initial'
      })
    ).toEqual({
      idempotencyKey: 'booking_request_0001',
      slotId: 'slot-001',
      serviceId: 'service-001',
      bookingKind: 'initial'
    });
  });
  it.each([
    ['unapproved email', { email: 'person@example.invalid' }],
    [
      'patient profile',
      { patient: { fullName: 'PRIVATE_FIELD_SENTINEL_NAME' } }
    ],
    ['client actor', { actorId: 'front_desk_001' }],
    ['client role', { role: 'admin' }],
    ['client patient id', { patientId: 'patient_001' }],
    ['client time', { requestedAt: '2030-07-20T09:00:00.000Z' }],
    [
      'unapproved privacy decision',
      {
        privacyAcceptance: {
          policyVersion: 'privacy-v1',
          acceptedAt: '2030-07-20T09:00:00.000Z'
        }
      }
    ],
    ['free text', { notes: 'This field must not be collected.' }]
  ])('rejects %s in a booking command', (_caseName, extraField) => {
    const result = CreateAppointmentRequestSchema.safeParse({
      idempotencyKey: 'booking_request_0001',
      slotId: 'slot-001',
      serviceId: 'service-001',
      bookingKind: 'initial',
      ...extraField
    });
    expect(result.success).toBe(false);
  });
  it('keeps health and errors in stable structured envelopes', () => {
    expect(
      HealthResponseSchema.parse({ service: 'api', status: 'ok' })
    ).toEqual({
      service: 'api',
      status: 'ok'
    });
    expect(
      ApiErrorResponseSchema.parse({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The request cannot be processed.',
          correlationId: 'corr-001'
        }
      }).error.code
    ).toBe('VALIDATION_FAILED');
  });
  it('inventories every reserved v1 error code', () => {
    expect(ApiErrorCodeSchema.options).toEqual([
      'AUTHENTICATION_REQUIRED',
      'AUTHORIZATION_DENIED',
      'CONFLICT',
      'IDEMPOTENCY_MISMATCH',
      'INTERNAL_ERROR',
      'NOT_FOUND',
      'POLICY_ACCEPTANCE_REQUIRED',
      'RATE_LIMITED',
      'SERVICE_UNAVAILABLE',
      'VALIDATION_FAILED'
    ]);
  });
});
describe('staff appointment transition command', () => {
  const validKey = 'transition_request_0001';
  it.each([['confirm_cancellation'], ['complete'], ['no_show']] as const)(
    'accepts the %s action with only a key',
    (transition) => {
      expect(
        TransitionAppointmentRequestSchema.parse({
          idempotencyKey: validKey,
          transition
        })
      ).toEqual({ idempotencyKey: validKey, transition });
    }
  );
  it('does not accept the patient-only request_cancellation action', () => {
    expect(StaffAppointmentTransitionSchema.options).toEqual([
      'confirm_cancellation',
      'complete',
      'no_show'
    ]);
    expect(
      TransitionAppointmentRequestSchema.safeParse({
        idempotencyKey: validKey,
        transition: 'request_cancellation'
      }).success
    ).toBe(false);
  });
  it.each(unapprovedFields)(
    'rejects %s in a transition command',
    (_caseName, extraField) => {
      expect(
        TransitionAppointmentRequestSchema.safeParse({
          idempotencyKey: validKey,
          transition: 'complete',
          ...extraField
        }).success
      ).toBe(false);
    }
  );
  it('maps each wire transition to exactly one domain transition', () => {
    expect(STAFF_TRANSITION_TO_DOMAIN).toEqual({
      confirm_cancellation: 'cancel',
      complete: 'complete',
      no_show: 'no_show'
    });
    expect(new Set(Object.values(STAFF_TRANSITION_TO_DOMAIN))).toEqual(
      new Set(['cancel', 'complete', 'no_show'])
    );
  });
  it('returns only a resulting terminal status', () => {
    expect(
      TransitionAppointmentResponseSchema.parse({
        appointmentId: 'appointment_001',
        status: 'completed'
      })
    ).toEqual({ appointmentId: 'appointment_001', status: 'completed' });
    expect(
      TransitionAppointmentResponseSchema.safeParse({
        appointmentId: 'appointment_001',
        status: 'confirmed'
      }).success
    ).toBe(false);
  });
});
describe('delete command', () => {
  const validKey = 'delete_request_0001';
  it('accepts only the idempotency key and a listed reason', () => {
    expect(
      DeleteAppointmentRequestSchema.parse({
        idempotencyKey: validKey,
        reasonCode: 'duplicate_record'
      })
    ).toEqual({ idempotencyKey: validKey, reasonCode: 'duplicate_record' });
  });
  it('refuses free text or an unlisted reason, and requires one at all', () => {
    for (const reasonCode of [
      'PRIVATE_FIELD_SENTINEL_FREE_TEXT',
      'other',
      'patient_request',
      ''
    ])
      expect(
        DeleteAppointmentRequestSchema.safeParse({
          idempotencyKey: validKey,
          reasonCode
        }).success
      ).toBe(false);
    expect(
      DeleteAppointmentRequestSchema.safeParse({ idempotencyKey: validKey })
        .success
    ).toBe(false);
  });
  it('inventories the operator reasons and excludes data-rights erasure', () => {
    expect(DeleteAppointmentReasonSchema.options).toEqual([
      'duplicate_record',
      'wrong_patient',
      'created_in_error'
    ]);
  });
  it.each(unapprovedFields)(
    'rejects %s in a delete command',
    (_caseName, extraField) => {
      expect(
        DeleteAppointmentRequestSchema.safeParse({
          idempotencyKey: validKey,
          reasonCode: 'duplicate_record',
          ...extraField
        }).success
      ).toBe(false);
    }
  );
  it('returns no status, only the audit event that replaced the record', () => {
    expect(
      DeleteAppointmentResponseSchema.parse({
        appointmentId: 'appointment_001',
        deleted: true,
        auditEventId: 'audit_appointment_001_deleted'
      }).deleted
    ).toBe(true);
    expect(
      DeleteAppointmentResponseSchema.safeParse({
        appointmentId: 'appointment_001',
        deleted: true,
        auditEventId: 'audit_appointment_001_deleted',
        status: 'cancelled'
      }).success
    ).toBe(false);
  });
});
describe('reschedule command', () => {
  const validKey = 'reschedule_request_0001';
  it('accepts only the idempotency key and the target slot', () => {
    expect(
      RescheduleAppointmentRequestSchema.parse({
        idempotencyKey: validKey,
        targetSlotId: 'slot-002'
      })
    ).toEqual({ idempotencyKey: validKey, targetSlotId: 'slot-002' });
  });
  it.each(unapprovedFields)(
    'rejects %s in a reschedule command',
    (_caseName, extraField) => {
      expect(
        RescheduleAppointmentRequestSchema.safeParse({
          idempotencyKey: validKey,
          targetSlotId: 'slot-002',
          ...extraField
        }).success
      ).toBe(false);
    }
  );
  it('keeps the appointment confirmed and returns authoritative times', () => {
    expect(
      RescheduleAppointmentResponseSchema.parse({
        appointmentId: 'appointment_001',
        status: 'confirmed',
        startsAt: '2030-01-02T04:00:00.000Z',
        endsAt: '2030-01-02T05:00:00.000Z'
      }).status
    ).toBe('confirmed');
    expect(
      RescheduleAppointmentResponseSchema.safeParse({
        appointmentId: 'appointment_001',
        status: 'confirmed',
        startsAt: '2030-01-02T04:00:00.000Z'
      }).success
    ).toBe(false);
  });
});
