import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { Environment } from '../config/environment';
import { JobQueueService } from '../jobs/job-queue.service';
import { MediaService } from './media.service';

const recordId = '11111111-1111-4111-8111-111111111111';
const mediaAssetId = '22222222-2222-4222-8222-222222222222';
const secondAssetId = '33333333-3333-4333-8333-333333333333';

function createService(dataSource: DataSource) {
  const config = {
    get: vi.fn((key: string) => {
      if (key === 'MEDIA_MAX_VIDEO_BYTES') return 52_428_800;
      return '';
    }),
  } as unknown as ConfigService<Environment, true>;
  return new MediaService(dataSource, config, {} as JobQueueService);
}

describe('MediaService record attachments', () => {
  it('attaches owned media to an editable draft while holding the record lock', async () => {
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([{ status: 'draft' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const dataSource = {
      query: vi.fn().mockResolvedValue([
        {
          id: mediaAssetId,
          processing_status: 'approved',
          media_kind: 'image',
        },
      ]),
      transaction: vi.fn(async (callback: (manager: EntityManager) => Promise<unknown>) =>
        callback({ query: managerQuery } as unknown as EntityManager),
      ),
    } as unknown as DataSource;
    const service = createService(dataSource);

    const result = await service.attachToRecord('teacher', recordId, {
      mediaAssetId,
      purpose: 'field photo',
      caption: 'North outcrop',
      description: 'Stratigraphic layer exposed by road cut.',
      altText: 'Exposed limestone bedding planes.',
      position: 1,
      isPrimary: true,
    });

    expect(result.caption).toBe('North outcrop');
    expect(result.isPrimary).toBe(true);

    // Call 0: assertRecordEditable lock
    expect(managerQuery.mock.calls[0]?.[0]).toContain('FOR UPDATE');
    // Call 1: unsetting prior primary image
    expect(managerQuery.mock.calls[1]?.[0]).toContain('UPDATE record_media SET is_primary = false');
    // Call 2: inserting record_media with all metadata
    expect(managerQuery.mock.calls[2]?.[0]).toContain('INSERT INTO record_media');
    expect(managerQuery.mock.calls[2]?.[1]).toEqual([
      recordId,
      mediaAssetId,
      'field photo',
      'North outcrop',
      'Stratigraphic layer exposed by road cut.',
      'Exposed limestone bedding planes.',
      1,
      true,
    ]);
    // Call 3: updating record timestamp
    expect(managerQuery.mock.calls[3]?.[0]).toContain('UPDATE scientific_records');
    // Call 4: content audit event
    expect(managerQuery.mock.calls[4]?.[0]).toContain('INSERT INTO content_audit_events');
  });

  it('rejects making a non-image attachment the primary image', async () => {
    const dataSource = {
      query: vi.fn().mockResolvedValue([
        {
          id: mediaAssetId,
          processing_status: 'approved',
          media_kind: 'document',
        },
      ]),
    } as unknown as DataSource;
    const service = createService(dataSource);

    await expect(
      service.attachToRecord('teacher', recordId, {
        mediaAssetId,
        purpose: 'lab report',
        isPrimary: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('atomically updates attachment metadata and replaces previous primary image', async () => {
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([{ status: 'draft' }]) // record editable
      .mockResolvedValueOnce([
        {
          record_id: recordId,
          media_asset_id: mediaAssetId,
          purpose: 'field photo',
          caption: 'Old caption',
          description: null,
          alt_text: null,
          position: 0,
          is_primary: false,
          media_kind: 'image',
          rights_statement: 'Old field-team permission',
          credit: 'Old credit',
          licence: null,
        },
      ]) // existing attachment row
      .mockResolvedValueOnce([]) // unset other primary
      .mockResolvedValueOnce([]) // update record_media
      .mockResolvedValueOnce([]) // update media_assets rights metadata
      .mockResolvedValueOnce([]) // update record updated_at
      .mockResolvedValueOnce([]); // insert audit event

    const dataSource = {
      transaction: vi.fn(async (cb: (m: EntityManager) => Promise<unknown>) =>
        cb({ query: managerQuery } as unknown as EntityManager),
      ),
    } as unknown as DataSource;
    const service = createService(dataSource);

    const updated = await service.updateAttachment('teacher', recordId, mediaAssetId, {
      caption: 'Updated outcrop view',
      description: 'Extended description',
      altText: 'Close up of limestone',
      position: 2,
      isPrimary: true,
      rightsStatement: 'Updated field-team permission',
      credit: 'Geo-Kurdistan field team',
      licence: 'CC BY 4.0',
    });

    expect(updated).toEqual({
      recordId,
      mediaAssetId,
      purpose: 'field photo',
      caption: 'Updated outcrop view',
      description: 'Extended description',
      altText: 'Close up of limestone',
      position: 2,
      isPrimary: true,
      rightsStatement: 'Updated field-team permission',
      credit: 'Geo-Kurdistan field team',
      licence: 'CC BY 4.0',
    });

    expect(managerQuery.mock.calls[2]?.[0]).toContain('UPDATE record_media SET is_primary = false');
    expect(managerQuery.mock.calls[3]?.[0]).toContain('UPDATE record_media');
    expect(managerQuery.mock.calls[4]?.[0]).toContain('UPDATE media_assets');
    expect(managerQuery.mock.calls[4]?.[1]).toEqual([
      mediaAssetId,
      'Updated field-team permission',
      'Geo-Kurdistan field team',
      'CC BY 4.0',
    ]);
    expect(managerQuery.mock.calls[6]?.[0]).toContain('INSERT INTO content_audit_events');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(managerQuery.mock.calls[6]?.[1]?.[1]).toBe('scientific-record.primary-media-changed');
  });

  it('safely reorders attachments and validates that all IDs belong to the record', async () => {
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([{ status: 'draft' }]) // record editable
      .mockResolvedValueOnce([
        { media_asset_id: mediaAssetId, owner_user_id: 'teacher' },
        { media_asset_id: secondAssetId, owner_user_id: 'teacher' },
      ]) // existing attachments
      .mockResolvedValueOnce([]) // update pos 0
      .mockResolvedValueOnce([]) // update pos 1
      .mockResolvedValueOnce([]) // update record timestamp
      .mockResolvedValueOnce([]); // insert audit event

    const listQuery = vi
      .fn()
      .mockResolvedValueOnce([{ id: recordId }])
      .mockResolvedValueOnce([
        { mediaAssetId: secondAssetId, position: 0 },
        { mediaAssetId, position: 1 },
      ]);

    const dataSource = {
      query: listQuery,
      transaction: vi.fn(async (cb: (m: EntityManager) => Promise<unknown>) =>
        cb({ query: managerQuery } as unknown as EntityManager),
      ),
    } as unknown as DataSource;
    const service = createService(dataSource);

    const reordered = await service.reorderAttachments('teacher', recordId, [
      secondAssetId,
      mediaAssetId,
    ]);

    expect(managerQuery.mock.calls[2]?.[0]).toContain('UPDATE record_media SET position = $3');
    expect(managerQuery.mock.calls[2]?.[1]).toEqual([recordId, secondAssetId, 0]);
    expect(managerQuery.mock.calls[3]?.[1]).toEqual([recordId, mediaAssetId, 1]);
    expect(managerQuery.mock.calls[5]?.[0]).toContain('INSERT INTO content_audit_events');
    expect(reordered.items).toHaveLength(2);
  });

  it('rejects reordering when duplicate IDs or unattached media IDs are passed', async () => {
    const service = createService({} as DataSource);

    // Duplicate IDs
    await expect(
      service.reorderAttachments('teacher', recordId, [mediaAssetId, mediaAssetId]),
    ).rejects.toBeInstanceOf(BadRequestException);

    // Unattached media ID
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([{ status: 'draft' }])
      .mockResolvedValueOnce([{ media_asset_id: mediaAssetId, owner_user_id: 'teacher' }]);
    const dataSource = {
      transaction: vi.fn(async (cb: (m: EntityManager) => Promise<unknown>) =>
        cb({ query: managerQuery } as unknown as EntityManager),
      ),
    } as unknown as DataSource;
    const serviceWithDb = createService(dataSource);

    await expect(
      serviceWithDb.reorderAttachments('teacher', recordId, [mediaAssetId, secondAssetId]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('detaches an attachment from a draft without deleting the underlying media asset', async () => {
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([{ status: 'draft' }]) // record editable
      .mockResolvedValueOnce([{ is_primary: true }]) // existing attachment
      .mockResolvedValueOnce([]) // DELETE FROM record_media
      .mockResolvedValueOnce([]) // UPDATE scientific_records
      .mockResolvedValueOnce([]); // INSERT INTO content_audit_events

    const dataSource = {
      transaction: vi.fn(async (cb: (m: EntityManager) => Promise<unknown>) =>
        cb({ query: managerQuery } as unknown as EntityManager),
      ),
    } as unknown as DataSource;
    const service = createService(dataSource);

    const result = await service.detachFromRecord('teacher', recordId, mediaAssetId);

    expect(result).toEqual({ success: true, recordId, mediaAssetId });
    expect(managerQuery.mock.calls[2]?.[0]).toContain('DELETE FROM record_media');
    expect(managerQuery.mock.calls[2]?.[0]).not.toContain('media_assets');
    expect(managerQuery.mock.calls[4]?.[0]).toContain('INSERT INTO content_audit_events');
    expect(managerQuery.mock.calls[4]?.[0]).toContain('scientific-record.media-detached');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(managerQuery.mock.calls[4]?.[1]?.[0]).toBe('teacher');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(managerQuery.mock.calls[4]?.[1]?.[1]).toBe(recordId);
  });

  it.each(['published', 'in_review', 'archived'])(
    'blocks attachment mutations on %s records',
    async (status) => {
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

      await expect(
        service.updateAttachment('teacher', recordId, mediaAssetId, {
          caption: 'attempted update',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      await expect(
        service.detachFromRecord('teacher', recordId, mediaAssetId),
      ).rejects.toBeInstanceOf(ConflictException);
    },
  );

  it('rejects cross-user attachment when media is owned by another user', async () => {
    const dataSource = {
      query: vi.fn().mockResolvedValue([]), // no owned media found for this user
    } as unknown as DataSource;
    const service = createService(dataSource);

    await expect(
      service.attachToRecord('other-teacher', recordId, {
        mediaAssetId,
        purpose: 'stolen media',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects cross-user attachment metadata changes and detach operations', async () => {
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([{ status: 'draft' }])
      .mockResolvedValueOnce([]);
    const dataSource = {
      transaction: vi.fn(async (callback: (manager: EntityManager) => Promise<unknown>) =>
        callback({ query: managerQuery } as unknown as EntityManager),
      ),
    } as unknown as DataSource;
    const service = createService(dataSource);

    await expect(
      service.updateAttachment('other-teacher', recordId, mediaAssetId, {
        caption: 'attempted change',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    managerQuery.mockReset();
    managerQuery.mockResolvedValueOnce([{ status: 'draft' }]).mockResolvedValueOnce([]);
    await expect(
      service.detachFromRecord('other-teacher', recordId, mediaAssetId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists attachments in display order without exposing private storage keys', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: recordId }])
      .mockResolvedValueOnce([
        {
          mediaAssetId,
          purpose: 'field photo',
          position: 0,
          caption: 'North cliff',
          description: null,
          altText: 'Cliff face',
          isPrimary: true,
          mediaKind: 'image',
          processingStatus: 'approved',
          filename: 'cliff.jpg',
          rightsStatement: 'Public domain',
          licence: null,
          credit: null,
        },
      ]);
    const service = createService({ query } as unknown as DataSource);
    const result = await service.listRecordAttachments(recordId);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.caption).toBe('North cliff');
    expect(result.items[0]?.isPrimary).toBe(true);

    const [sql, params] = query.mock.calls[1] as [string, unknown[]];
    expect(sql).not.toMatch(/SELECT\s+\*/i);
    expect(sql).not.toContain('storage_key');
    expect(sql).not.toContain('derivative_storage_key');
    expect(sql).toContain('ORDER BY rm.position ASC');
    expect(params).toEqual([recordId]);
  });

  it('evaluates record media publication readiness correctly', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: recordId }]) // record exists
      .mockResolvedValueOnce([
        {
          is_primary: true,
          alt_text: 'Descriptive alt text for the outcrop.',
          processing_status: 'approved',
          rights_statement: 'CC-BY-4.0',
          media_kind: 'image',
        },
      ]);
    const service = createService({ query } as unknown as DataSource);
    const readiness = await service.getRecordMediaPublicationReadiness(recordId);

    expect(readiness.valid).toBe(true);
    expect(readiness.hasPrimaryImage).toBe(true);
    expect(readiness.isPrimaryImageApproved).toBe(true);
    expect(readiness.hasRightsStatement).toBe(true);
    expect(readiness.hasUsefulAltText).toBe(true);
    expect(readiness.issues).toEqual([]);
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
      query: vi.fn().mockResolvedValue([
        {
          id: mediaAssetId,
          processing_status: 'approved',
          media_kind: 'image',
        },
      ]),
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
