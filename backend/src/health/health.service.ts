import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Environment } from '../config/environment';

export interface ReadinessResult {
  status: 'ready' | 'not_ready';
  checks: {
    database: 'up' | 'down';
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  async readiness(): Promise<ReadinessResult> {
    if (!this.dataSource.isInitialized) {
      return { status: 'not_ready', checks: { database: 'down' } };
    }

    const timeoutMs = this.config.get('HEALTH_DB_TIMEOUT_MS', { infer: true });
    let timeout: NodeJS.Timeout | undefined;

    try {
      await Promise.race([
        this.dataSource.query('SELECT 1'),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error('Database health check timed out')),
            timeoutMs,
          );
        }),
      ]);

      return { status: 'ready', checks: { database: 'up' } };
    } catch {
      return { status: 'not_ready', checks: { database: 'down' } };
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
}
