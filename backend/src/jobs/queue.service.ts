import { Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import PgBoss from 'pg-boss';
import { Environment } from '../config/environment';
import { FOUNDATION_PROOF_QUEUE, FoundationProofPayload } from './jobs.constants';

@Injectable()
export class QueueService implements OnModuleInit, OnApplicationShutdown {
  private boss?: PgBoss;

  constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(QueueService.name);
  }

  async onModuleInit(): Promise<void> {
    this.boss = new PgBoss({
      connectionString: this.config.get('DATABASE_URL', { infer: true }),
      schema: this.config.get('QUEUE_SCHEMA', { infer: true }),
      application_name: `${this.config.get('APP_NAME', { infer: true })}-worker`,
      max: this.config.get('QUEUE_CONCURRENCY', { infer: true }) + 1,
    });
    this.boss.on('error', (error) => this.logger.error({ err: error }, 'Queue failure'));
    this.boss.on('warning', (warning) => this.logger.warn({ warning }, 'Queue warning'));

    await this.boss.start();
    await this.boss.createQueue(FOUNDATION_PROOF_QUEUE, {
      retryLimit: 3,
      retryDelay: 2,
      retryBackoff: true,
      expireInSeconds: 30,
      retentionSeconds: 86_400,
    });
    await this.boss.work<FoundationProofPayload>(
      FOUNDATION_PROOF_QUEUE,
      {
        batchSize: 1,
        pollingIntervalSeconds: 2,
      },
      (jobs) => {
        for (const job of jobs) {
          this.logger.info(
            { jobId: job.id, runId: job.data.runId },
            'Processed idempotent foundation proof job',
          );
        }
        return Promise.resolve();
      },
    );

    this.logger.info('PostgreSQL job worker started');
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.boss) {
      await this.boss.stop({ graceful: true, timeout: 10_000, wait: true });
    }
  }
}
