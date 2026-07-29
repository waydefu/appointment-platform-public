import type { CreateAppointmentRequest } from '@appointment-platform/contracts';
import type { AuthenticationContext } from '../auth/authentication-context.js';
export interface AppointmentAuthorizationPolicy {
  assertCanCreate(
    context: AuthenticationContext,
    command: CreateAppointmentRequest
  ): Promise<void>;
}
