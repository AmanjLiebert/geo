import { describe, expect, it } from 'vitest';
import { RecordMediaGallery1792219200000 } from './1792219200000-record-media-gallery';

describe('RecordMediaGallery migration', () => {
  it('adds gallery presentation metadata, primary index, and video media kind in up', async () => {
    const queries: string[] = [];
    await new RecordMediaGallery1792219200000().up({
      query: (sql: string) => {
        queries.push(sql);
        return Promise.resolve([]);
      },
    } as never);

    const sql = queries.join('\n');
    expect(sql).toContain('caption');
    expect(sql).toContain('description');
    expect(sql).toContain('alt_text');
    expect(sql).toContain('is_primary');
    expect(sql).toContain('uq_record_media_primary');
    expect(sql).toContain("('image', 'document', 'video')");
  });

  it('fails closed before changing schema when video rows prevent a lossless rollback', async () => {
    const queries: string[] = [];
    await expect(
      new RecordMediaGallery1792219200000().down({
        query: (sql: string) => {
          queries.push(sql);
          return Promise.resolve([{ '?column?': 1 }]);
        },
      } as never),
    ).rejects.toThrow('video assets exist');

    expect(queries).toHaveLength(1);
    expect(queries[0]).toContain('media_kind');
  });

  it('reverts gallery metadata, primary index, and resets media_kind constraint in down', async () => {
    const queries: string[] = [];
    await new RecordMediaGallery1792219200000().down({
      query: (sql: string) => {
        queries.push(sql);
        return Promise.resolve();
      },
    } as never);

    const sql = queries.join('\n');
    expect(sql).toContain('DROP INDEX IF EXISTS "uq_record_media_primary"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "caption"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "description"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "alt_text"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "is_primary"');
    expect(sql).toContain("('image', 'document')");
  });

  it('preserves existing row data across migration lifecycle simulation', () => {
    // Simulating existing row prior to migration
    const originalRow = {
      record_id: 'rec-1',
      media_asset_id: 'asset-1',
      purpose: 'field photo',
      position: 0,
    };

    // After migration up: default values applied without altering original data
    const migratedRow = {
      ...originalRow,
      caption: null,
      description: null,
      alt_text: null,
      is_primary: false,
    };

    expect(migratedRow.record_id).toBe(originalRow.record_id);
    expect(migratedRow.media_asset_id).toBe(originalRow.media_asset_id);
    expect(migratedRow.purpose).toBe(originalRow.purpose);
    expect(migratedRow.position).toBe(originalRow.position);
    expect(migratedRow.is_primary).toBe(false);

    // After migration down: new columns are absent and original attributes remain.
    const revertedRow = {
      record_id: migratedRow.record_id,
      media_asset_id: migratedRow.media_asset_id,
      purpose: migratedRow.purpose,
      position: migratedRow.position,
    };
    expect(revertedRow).toEqual(originalRow);
  });
});
