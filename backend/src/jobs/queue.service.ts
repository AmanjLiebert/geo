import { Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { MediaProcessorService } from '../media/media-processor.service';
import { JobQueueService } from './job-queue.service';

@Injectable()
export class QueueService implements OnModuleInit, OnApplicationShutdown {
  private cleanupTimer?: NodeJS.Timeout;
  private cleanupRunning = false;

  constructor(
    private readonly jobs: JobQueueService,
    private readonly mediaProcessor: MediaProcessorService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(QueueService.name);
  }

  async onModuleInit(): Promise<void> {
    await this.jobs.workFoundation((jobs) => {
      for (const job of jobs)
        this.logger.info(
          { jobId: job.id, runId: job.data.runId },
          'Processed idempotent foundation proof job',
        );
      return Promise.resolve();
    });
    await this.jobs.workMedia(async (jobs) => {
      await Promise.all(
        jobs.map(async (job) => {
          this.logger.info(
            { jobId: job.id, mediaAssetId: job.data.mediaAssetId },
            'Processing quarantined media',
          );
          await this.mediaProcessor.process(job.data.mediaAssetId);
        }),
      );
    });

    for (const mediaAssetId of await this.mediaProcessor.pendingIds()) {
      await this.jobs.enqueueMedia(mediaAssetId);
    }

    await this.runMediaCleanup();
    this.cleanupTimer = setInterval(() => void this.runMediaCleanup(), 15 * 60 * 1_000);
    this.cleanupTimer.unref();

    this.logger.info('PostgreSQL job worker started');
  }

  onApplicationShutdown(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  private async runMediaCleanup(): Promise<void> {
    if (this.cleanupRunning) return;
    this.cleanupRunning = true;
    try {
      const cleaned = await this.mediaProcessor.cleanupExpiredUploads();
      if (cleaned) this.logger.info({ cleaned }, 'Archived expired pending media uploads');
    } catch (error) {
      this.logger.error({ err: error }, 'Expired media upload cleanup failed');
    } finally {
      this.cleanupRunning = false;
    }
  }
}
