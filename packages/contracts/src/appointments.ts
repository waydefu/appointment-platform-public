import { z } from 'zod';
import {
  IdempotencyKeySchema,
  OpaqueIdentifierSchema,
  UtcIsoTimestampSchema
} from './common.js';
export const AppointmentStatusSchema = z.enum([
  'confirmed',
  'cancellation_requested',
  'cancelled',
  'completed',
  'no_show'
]);
export const CreateAppointmentRequestSchema = z
  .object({
    idempotencyKey: IdempotencyKeySchema,
    slotId: OpaqueIdentifierSchema,
    serviceId: OpaqueIdentifierSchema,
    bookingKind: z.enum(['initial', 'follow_up'])
  })
  .strict();
export const CreateAppointmentResponseSchema = z
  .object({
    appointmentId: OpaqueIdentifierSchema,
    status: z.literal('confirmed'),
    startsAt: UtcIsoTimestampSchema,
    endsAt: UtcIsoTimestampSchema
  })
  .strict();
export const CancelAppointmentRequestSchema = z
  .object({
    idempotencyKey: IdempotencyKeySchema
  })
  .strict();
export const CancelAppointmentResponseSchema = z
  .object({
    appointmentId: OpaqueIdentifierSchema,
    status: z.enum(['cancellation_requested', 'cancelled'])
  })
  .strict();
export const StaffAppointmentTransitionSchema = z.enum([
  'confirm_cancellation',
  'complete',
  'no_show'
]);
export const STAFF_TRANSITION_TO_DOMAIN = {
  confirm_cancellation: 'cancel',
  complete: 'complete',
  no_show: 'no_show'
} as const;
export const TransitionAppointmentRequestSchema = z
  .object({
    idempotencyKey: IdempotencyKeySchema,
    transition: StaffAppointmentTransitionSchema
  })
  .strict();
export const TransitionAppointmentResponseSchema = z
  .object({
    appointmentId: OpaqueIdentifierSchema,
    status: z.enum(['cancelled', 'completed', 'no_show'])
  })
  .strict();
export const RescheduleAppointmentRequestSchema = z
  .object({
    idempotencyKey: IdempotencyKeySchema,
    targetSlotId: OpaqueIdentifierSchema
  })
  .strict();
export const RescheduleAppointmentResponseSchema = z
  .object({
    appointmentId: OpaqueIdentifierSchema,
    status: z.literal('confirmed'),
    startsAt: UtcIsoTimestampSchema,
    endsAt: UtcIsoTimestampSchema
  })
  .strict();
export const DeleteAppointmentReasonSchema = z.enum([
  'duplicate_record',
  'wrong_patient',
  'created_in_error'
]);
export const DeleteAppointmentRequestSchema = z
  .object({
    idempotencyKey: IdempotencyKeySchema,
    reasonCode: DeleteAppointmentReasonSchema
  })
  .strict();
export const DeleteAppointmentResponseSchema = z
  .object({
    appointmentId: OpaqueIdentifierSchema,
    deleted: z.literal(true),
    auditEventId: OpaqueIdentifierSchema
  })
  .strict();
export type CreateAppointmentRequest = z.infer<
  typeof CreateAppointmentRequestSchema
>;
export type CreateAppointmentResponse = z.infer<
  typeof CreateAppointmentResponseSchema
>;
export type CancelAppointmentRequest = z.infer<
  typeof CancelAppointmentRequestSchema
>;
export type CancelAppointmentResponse = z.infer<
  typeof CancelAppointmentResponseSchema
>;
export type StaffAppointmentTransition = z.infer<
  typeof StaffAppointmentTransitionSchema
>;
export type TransitionAppointmentRequest = z.infer<
  typeof TransitionAppointmentRequestSchema
>;
export type TransitionAppointmentResponse = z.infer<
  typeof TransitionAppointmentResponseSchema
>;
export type RescheduleAppointmentRequest = z.infer<
  typeof RescheduleAppointmentRequestSchema
>;
export type RescheduleAppointmentResponse = z.infer<
  typeof RescheduleAppointmentResponseSchema
>;
export type DeleteAppointmentReason = z.infer<
  typeof DeleteAppointmentReasonSchema
>;
export type DeleteAppointmentRequest = z.infer<
  typeof DeleteAppointmentRequestSchema
>;
export type DeleteAppointmentResponse = z.infer<
  typeof DeleteAppointmentResponseSchema
>;
