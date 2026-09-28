import { Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import PgBoss, { WorkHandler } from 'pg-boss';
import { Environment } from '../config/environment';
import {
  FOUNDATION_PROOF_QUEUE,
  FOUNDATION_PROOF_QUEUE_OPTIONS,
  FoundationProofPayload,
  MEDIA_PROCESSING_QUEUE,
  MEDIA_PROCESSING_QUEUE_OPTIONS,
  MediaProcessingPayload,
} from './jobs.constants';

@Injectable()
export class JobQueueService implements OnModuleInit, OnApplicationShutdown {
  private boss?: PgBoss;

  constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(JobQueueService.name);
  }

  async onModuleInit(): Promise<void> {
    this.boss = new PgBoss({
      connectionString: this.config.get('DATABASE_URL', { infer: true }),
      schema: this.config.get('QUEUE_SCHEMA', { infer: true }),
      application_name: `${this.config.get('APP_NAME', { infer: true })}-queue`,
      max: this.config.get('QUEUE_CONCURRENCY', { infer: true }) + 1,
    });
    this.boss.on('error', (error) => this.logger.error({ err: error }, 'Queue failure'));
    this.boss.on('warning', (warning) => this.logger.warn({ warning }, 'Queue warning'));
    await this.boss.start();
    await this.boss.createQueue(FOUNDATION_PROOF_QUEUE, FOUNDATION_PROOF_QUEUE_OPTIONS);
    await this.boss.createQueue(MEDIA_PROCESSING_QUEUE, MEDIA_PROCESSING_QUEUE_OPTIONS);
  }

  async enqueueMedia(mediaAssetId: string): Promise<string> {
    const jobId = await this.requireBoss().send(MEDIA_PROCESSING_QUEUE, {
      mediaAssetId,
      requestedAt: new Date().toISOString(),
    } satisfies MediaProcessingPayload);
    if (!jobId) throw new Error('The media-processing job was not enqueued.');
    return jobId;
  }

  async workFoundation(handler: WorkHandler<FoundationProofPayload>): Promise<void> {
    await this.requireBoss().work<FoundationProofPayload>(
      FOUNDATION_PROOF_QUEUE,
      { batchSize: 1, pollingIntervalSeconds: 2 },
      handler,
    );
  }

  async workMedia(handler: WorkHandler<MediaProcessingPayload>): Promise<void> {
    await this.requireBoss().work<MediaProcessingPayload>(
      MEDIA_PROCESSING_QUEUE,
      {
        batchSize: this.config.get('QUEUE_CONCURRENCY', { infer: true }),
        pollingIntervalSeconds: 2,
      },
      handler,
    );
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.boss) await this.boss.stop({ graceful: true, timeout: 10_000, wait: true });
  }

  private requireBoss(): PgBoss {
    if (!this.boss) throw new Error('The job queue is not ready.');
    return this.boss;
  }
}
