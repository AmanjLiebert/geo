export interface JobStatus {
  state: string;
}

export interface JobStatusReader {
  getJobById<T>(queue: string, id: string): Promise<(JobStatus & { data?: T }) | null>;
}

export async function waitForJobCompletion(
  reader: JobStatusReader,
  queue: string,
  jobId: string,
  timeoutMs: number,
  pollingIntervalMs = 250,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const job = await reader.getJobById(queue, jobId);
    if (job?.state === 'completed') {
      return;
    }
    if (job?.state === 'failed' || job?.state === 'cancelled') {
      throw new Error(`The proof job entered terminal state ${job.state}.`);
    }
    await delay(pollingIntervalMs);
  }

  throw new Error('The proof job did not complete before the timeout.');
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
