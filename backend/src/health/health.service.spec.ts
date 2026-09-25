import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { Environment } from '../config/environment';
import { HealthService } from './health.service';

function configService(): ConfigService<Environment, true> {
  return {
    get: vi.fn().mockReturnValue(100),
  } as unknown as ConfigService<Environment, true>;
}

describe('HealthService', () => {
  it('reports ready when PostgreSQL answers', async () => {
    const dataSource = {
      isInitialized: true,
      query: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as DataSource;
    const service = new HealthService(dataSource, configService());

    await expect(service.readiness()).resolves.toEqual({
      status: 'ready',
      checks: { database: 'up' },
    });
  });

  it('reports not ready when PostgreSQL is unavailable', async () => {
    const dataSource = {
      isInitialized: true,
      query: vi.fn().mockRejectedValue(new Error('unavailable')),
    } as unknown as DataSource;
    const service = new HealthService(dataSource, configService());

    await expect(service.readiness()).resolves.toEqual({
      status: 'not_ready',
      checks: { database: 'down' },
    });
  });
});
