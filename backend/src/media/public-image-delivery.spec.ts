import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { DataSource } from 'typeorm';
import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { MediaService } from './media.service';
import { Environment } from '../config/environment';
import { JobQueueService } from '../jobs/job-queue.service';

function setup() {
  const state = { approved: true, hash: 'a', kind: 'display' };
  const query = vi.fn((sql: string) =>
    Promise.resolve(
      sql.includes('FROM media_assets')
        ? [
            {
              id: 'asset',
              media_kind: 'image',
              processing_status: state.approved ? 'approved' : 'rejected',
            },
          ]
        : [
            {
              storage_key: 'processed/test.webp',
              content_type: 'image/webp',
              sha256: state.hash,
              derivative_kind: state.kind,
            },
          ],
    ),
  );
  const config = new ConfigService({
    MEDIA_STORAGE_ENDPOINT: 'https://storage.example.test',
    MEDIA_STORAGE_BUCKET: 'test',
    MEDIA_STORAGE_KEY_ID: 'test',
    MEDIA_STORAGE_APPLICATION_KEY: 'test',
    MEDIA_STORAGE_REGION: 'test',
  });
  const service = new MediaService(
    { query } as unknown as DataSource,
    config as unknown as ConfigService<Environment, true>,
    {} as JobQueueService,
  );
  const client = (service as unknown as { client: S3Client }).client;
  const send = vi
    .spyOn(client, 'send')
    .mockResolvedValue({
      Body: Readable.from('image'),
      ContentType: 'image/webp',
      ContentLength: 5,
    } as never);
  return { service, state, query, send };
}

describe('public image revalidation', () => {
  it('avoids object downloads for an unchanged image but rechecks approval and metadata', async () => {
    const { service, query, send } = setup();
    const initial = await service.publicInlineImage('asset');
    const repeat = await service.publicInlineImage('asset', 'display', initial.etag);
    expect(repeat.stream).toBeNull();
    expect(query).toHaveBeenCalledTimes(4);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('denies a rejected image even with its previously valid ETag', async () => {
    const { service, state, send } = setup();
    const initial = await service.publicInlineImage('asset');
    state.approved = false;
    await expect(service.publicInlineImage('asset', 'display', initial.etag)).rejects.toThrow(
      'Approved public image not found',
    );
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('downloads the new derivative when image content changes', async () => {
    const { service, state, send } = setup();
    const initial = await service.publicInlineImage('asset');
    state.hash = 'changed';
    const replacement = await service.publicInlineImage('asset', 'display', initial.etag);
    expect(replacement.etag).not.toBe(initial.etag);
    expect(replacement.stream).not.toBeNull();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('requests thumbnail preference and keeps its validator separate from display', async () => {
    const { service, state, query } = setup();
    const initial = await service.publicInlineImage('asset');
    state.kind = 'thumbnail';
    const small = await service.publicInlineImage('asset', 'thumbnail', initial.etag);
    expect(query).toHaveBeenLastCalledWith(
      expect.stringContaining("derivative_kind IN ('display', 'thumbnail')"),
      ['asset', 'thumbnail'],
    );
    expect(small.etag).not.toBe(initial.etag);
    expect(small.stream).not.toBeNull();
  });
});
