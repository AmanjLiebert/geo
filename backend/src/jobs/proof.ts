import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import PgBoss from 'pg-boss';
import { validateEnvironment } from '../config/environment';
import { FOUNDATION_PROOF_QUEUE, FoundationProofPayload } from './jobs.constants';

async function runProof(): Promise<void> {
  const environment = validateEnvironment(process.env);
  const boss = new PgBoss({
    connectionString: environment.DATABASE_URL,
    schema: environment.QUEUE_SCHEMA,
    application_name: `${environment.APP_NAME}-job-proof`,
    max: 2,
  });
  const runId = randomUUID();
  let timeout: NodeJS.Timeout | undefined;

  boss.on('error', (error) => {
    process.stderr.write(`Queue error: ${error.message}\n`);
  });

  await boss.start();

  try {
    await boss.createQueue(FOUNDATION_PROOF_QUEUE, {
      retryLimit: 3,
      retryDelay: 1,
      retryBackoff: true,
      expireInSeconds: 30,
      retentionSeconds: 3_600,
    });

    const processed = new Promise<string>((resolve) => {
      void boss.work<FoundationProofPayload>(
        FOUNDATION_PROOF_QUEUE,
        { batchSize: 1, pollingIntervalSeconds: 1 },
        (jobs) => {
          for (const job of jobs) {
            if (job.data.runId === runId) {
              resolve(job.id);
            }
          }
          return Promise.resolve();
        },
      );
    });

    const payload: FoundationProofPayload = {
      runId,
      requestedAt: new Date().toISOString(),
    };
    const jobId = await boss.send(FOUNDATION_PROOF_QUEUE, payload, {
      singletonKey: runId,
    });

    if (!jobId) {
      throw new Error('The proof job was not enqueued.');
    }

    const processedJobId = await Promise.race([
      processed,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error('The proof job did not complete before the timeout.')),
          environment.JOB_PROOF_TIMEOUT_MS,
        );
      }),
    ]);

    process.stdout.write(`Queue proof succeeded for job ${processedJobId}.\n`);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
    await boss.stop({ graceful: true, timeout: 10_000, wait: true });
  }
}

void runProof().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown queue proof failure';
  process.stderr.write(`Queue proof failed: ${message}\n`);
  process.exitCode = 1;
});
