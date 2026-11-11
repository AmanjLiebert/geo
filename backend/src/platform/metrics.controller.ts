import { Controller, Get, Header, VERSION_NEUTRAL } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { Public } from '../identity/access.decorators';

// This route is unauthenticated inside the private container network and is not routed by Caddy.
@Public()
@Controller({ path: 'metrics', version: VERSION_NEUTRAL })
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header('cache-control', 'no-store')
  @Header('content-type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    return this.metrics.render();
  }
}
