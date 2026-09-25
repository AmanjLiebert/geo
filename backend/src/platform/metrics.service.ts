import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Histogram, Registry } from '@prometheus-io/client';

const metricLabels = ['method', 'route', 'status'] as const;

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly requests = new Counter({
    name: 'geo_kurdistan_http_requests_total',
    help: 'Total HTTP requests handled by the API.',
    labelNames: metricLabels,
    registers: [this.registry],
  });
  private readonly duration = new Histogram({
    name: 'geo_kurdistan_http_request_duration_seconds',
    help: 'HTTP request duration in seconds.',
    labelNames: metricLabels,
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [this.registry],
  });

  constructor() {
    this.registry.setDefaultLabels({ service: 'geo-kurdistan-api' });
    collectDefaultMetrics({ prefix: 'geo_kurdistan_', register: this.registry });
  }

  observeRequest(method: string, route: string, status: number, seconds: number): void {
    const labels = { method, route, status: String(status) };
    this.requests.inc(labels);
    this.duration.observe(labels, seconds);
  }

  async render(): Promise<string> {
    return this.registry.metrics();
  }
}
