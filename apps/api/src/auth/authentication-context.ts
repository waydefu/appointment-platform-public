export interface AuthenticationContext {
  readonly actorId: string;
  readonly actorRole: string;
  readonly verifiedPatientId?: string;
}
