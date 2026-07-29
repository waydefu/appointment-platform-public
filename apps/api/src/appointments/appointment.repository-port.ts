import type { BookingRequest } from '@appointment-platform/domain';
export interface ReservationResult {
  readonly appointmentId: string;
  readonly replayed: boolean;
}
export interface AppointmentRepositoryPort {
  reserve(request: BookingRequest): Promise<ReservationResult>;
}
