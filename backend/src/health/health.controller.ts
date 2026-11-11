import { Controller, Get, ServiceUnavailableException, VERSION_NEUTRAL } from '@nestjs/common';
import { HealthService, ReadinessResult } from './health.service';
import { Public } from '../identity/access.decorators';

@Public()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('live')
  liveness(): { status: 'alive' } {
    return { status: 'alive' };
  }

  @Get('ready')
  async readiness(): Promise<ReadinessResult> {
    const result = await this.health.readiness();
    if (result.status !== 'ready') {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }
}
