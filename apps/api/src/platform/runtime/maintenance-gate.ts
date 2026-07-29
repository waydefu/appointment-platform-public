import { ServiceUnavailableError } from '../errors/api-error.js';
export interface MaintenanceGate {
  assertAvailable(): void;
}
export class StaticMaintenanceGate implements MaintenanceGate {
  public constructor(private readonly underMaintenance: boolean) {}
  public assertAvailable(): void {
    if (this.underMaintenance) {
      throw new ServiceUnavailableError();
    }
  }
}
