import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@appointment-platform/contracts';
@Controller('health')
export class HealthController {
  @Get()
  public getHealth(): HealthResponse {
    return { service: 'api', status: 'ok' };
  }
}
