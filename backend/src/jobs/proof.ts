import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import PgBoss from 'pg-boss';
import { validateEnvironment } from '../config/environment';
import {
  FOUNDATION_PROOF_QUEUE,
  FOUNDATION_PROOF_QUEUE_OPTIONS,
  FoundationProofPayload,
} from './jobs.constants';
import { waitForJobCompletion } from './proof-status';

async function runProof(): Promise<void> {
  const environment = validateEnvironment(process.env);
  const boss = new PgBoss({
    connectionString: environment.DATABASE_URL,
    schema: environment.QUEUE_SCHEMA,
    application_name: `${environment.APP_NAME}-job-proof`,
    max: 2,
  });
  const runId = randomUUID();

  boss.on('error', (error) => {
    process.stderr.write(`Queue error: ${error.message}\n`);
  });

  await boss.start();

  try {
    await boss.createQueue(FOUNDATION_PROOF_QUEUE, FOUNDATION_PROOF_QUEUE_OPTIONS);

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

    await waitForJobCompletion(
      boss,
      FOUNDATION_PROOF_QUEUE,
      jobId,
      environment.JOB_PROOF_TIMEOUT_MS,
    );

    process.stdout.write(`Queue proof succeeded for job ${jobId}.\n`);
  } finally {
    await boss.stop({ graceful: true, timeout: 10_000, wait: true });
  }
}

void runProof().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown queue proof failure';
  process.stderr.write(`Queue proof failed: ${message}\n`);
  process.exitCode = 1;
});
