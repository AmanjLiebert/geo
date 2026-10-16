import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { Environment } from '../config/environment';
import { JobQueueService } from '../jobs/job-queue.service';
import { MediaService } from './media.service';

const recordId = '11111111-1111-4111-8111-111111111111';
const mediaAssetId = '22222222-2222-4222-8222-222222222222';

function createService(dataSource: DataSource) {
  const config = { get: vi.fn().mockReturnValue('') } as unknown as ConfigService<
    Environment,
    true
  >;
  return new MediaService(dataSource, config, {} as JobQueueService);
}

describe('MediaService record attachments', () => {
  it('attaches owned media to an editable draft while holding the record lock', async () => {
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([{ status: 'draft' }])
      .mockResolvedValueOnce([]);
    const dataSource = {
      query: vi.fn().mockResolvedValue([{ id: mediaAssetId, processing_status: 'approved' }]),
      transaction: vi.fn(async (callback: (manager: EntityManager) => Promise<unknown>) =>
        callback({ query: managerQuery } as unknown as EntityManager),
      ),
    } as unknown as DataSource;
    const service = createService(dataSource);

    await service.attachToRecord('teacher', recordId, { mediaAssetId, purpose: 'field photo' });
    expect(managerQuery.mock.calls[0]?.[0]).toContain('FOR UPDATE');
    expect(managerQuery.mock.calls[1]?.[0]).toContain('INSERT INTO record_media');
    expect(managerQuery.mock.calls[1]?.[1]).toEqual([recordId, mediaAssetId, 'field photo']);
    expect(managerQuery.mock.calls[2]?.[0]).toContain('UPDATE scientific_records');
    expect(managerQuery.mock.calls[3]?.[0]).toContain('INSERT INTO content_audit_events');
  });

  it.each(['published', 'archived'])('blocks attachment changes to %s records', async (status) => {
    const managerQuery = vi.fn().mockResolvedValue([{ status }]);
    const dataSource = {
      query: vi.fn().mockResolvedValue([{ id: mediaAssetId, processing_status: 'approved' }]),
      transaction: vi.fn(async (callback: (manager: EntityManager) => Promise<unknown>) =>
        callback({ query: managerQuery } as unknown as EntityManager),
      ),
    } as unknown as DataSource;
    const service = createService(dataSource);

    await expect(
      service.attachToRecord('teacher', recordId, {
        mediaAssetId,
        purpose: 'field photo',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(managerQuery).toHaveBeenCalledTimes(1);
    expect(managerQuery.mock.calls[0]?.[0]).toContain('FOR UPDATE');
  });

  it('lists metadata without exposing private storage keys', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: recordId }])
      .mockResolvedValueOnce([]);
    const service = createService({ query } as unknown as DataSource);
    expect(await service.listRecordAttachments(recordId)).toEqual({ items: [] });
    const [sql, params] = query.mock.calls[1] as [string, unknown[]];
    expect(sql).not.toMatch(/SELECT\s+\*/i);
    expect(sql).not.toContain('storage_key');
    expect(params).toEqual([recordId]);
  });

  it('rejects media attachments when category branch is archived, and allows them after restoration', async () => {
    let isCategoryArchived = true;
    const managerQuery = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes('FROM scientific_records')) {
        return Promise.resolve([
          {
            id: recordId,
            status: 'draft',
            category_id: 'cat-media-test',
            record_type_id: 'rt-1',
            template_version_id: 'tv-1',
          },
        ]);
      }
      if (sql.includes('FROM categories c')) {
        if (isCategoryArchived) return Promise.resolve([]);
        return Promise.resolve([{ id: 'cat-media-test' }]);
      }
      return Promise.resolve([]);
    });

    const dataSource = {
      query: vi.fn().mockResolvedValue([{ id: mediaAssetId, processing_status: 'approved' }]),
      transaction: vi.fn(async (cb: (m: EntityManager) => Promise<unknown>) =>
        cb({ query: managerQuery } as unknown as EntityManager),
      ),
    } as unknown as DataSource;
    const service = createService(dataSource);

    // Blocked while category branch is archived
    await expect(
      service.attachToRecord('teacher', recordId, {
        mediaAssetId,
        purpose: 'field photo',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    // Restore category branch
    isCategoryArchived = false;

    // Allowed after restoration
    const result = await service.attachToRecord('teacher', recordId, {
      mediaAssetId,
      purpose: 'field photo',
    });
    expect(result.recordId).toBe(recordId);
  });
});
