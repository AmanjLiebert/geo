import { describe, expect, it, vi } from 'vitest';
import { JobStatusReader, waitForJobCompletion } from './proof-status';

describe('waitForJobCompletion', () => {
  it('waits until an external worker completes the queued job', async () => {
    const getJobById = vi
      .fn()
      .mockResolvedValueOnce({ state: 'created' })
      .mockResolvedValueOnce({ state: 'active' })
      .mockResolvedValueOnce({ state: 'completed' });

    await waitForJobCompletion(
      { getJobById } as JobStatusReader,
      'foundation.proof',
      'job-1',
      100,
      1,
    );

    expect(getJobById).toHaveBeenCalledTimes(3);
  });

  it('fails immediately when the worker reports a terminal failure', async () => {
    const reader = {
      getJobById: vi.fn().mockResolvedValue({ state: 'failed' }),
    } as JobStatusReader;

    await expect(waitForJobCompletion(reader, 'foundation.proof', 'job-2', 100, 1)).rejects.toThrow(
      'terminal state failed',
    );
  });

  it('times out when no worker completes the job', async () => {
    const reader = {
      getJobById: vi.fn().mockResolvedValue({ state: 'created' }),
    } as JobStatusReader;

    await expect(waitForJobCompletion(reader, 'foundation.proof', 'job-3', 5, 1)).rejects.toThrow(
      'did not complete before the timeout',
    );
  });
});
