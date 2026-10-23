import { describe, expect, it, vi } from 'vitest';
import { QueryRunner } from 'typeorm';
import { RecordPublicationReadiness1792305600000 } from './1792305600000-record-publication-readiness';

describe('record publication readiness migration', () => {
  it('guards published records with category, English details, and primary-image checks', async () => {
    const query = vi.fn().mockResolvedValue([]);
    await new RecordPublicationReadiness1792305600000().up({ query } as unknown as QueryRunner);
    const sql = query.mock.calls.map(([statement]) => String(statement)).join('\n');
    expect(sql).toContain("c.publication_status = 'published'");
    expect(sql).toContain("t.locale = 'en'");
    expect(sql).toContain('t.reviewer_user_id IS DISTINCT FROM t.translator_user_id');
    expect(sql).toContain('rm.is_primary = true');
    expect(sql).toContain("m.media_kind = 'image'");
    expect(sql).toContain("m.processing_status = 'approved'");
    expect(sql).toContain('m.rights_statement');
    expect(sql).toContain('rm.alt_text');
  });

  it('drops only the readiness trigger and function on rollback', async () => {
    const query = vi.fn().mockResolvedValue([]);
    await new RecordPublicationReadiness1792305600000().down({ query } as unknown as QueryRunner);
    const sql = query.mock.calls.map(([statement]) => String(statement)).join('\n');
    expect(sql).toContain('DROP TRIGGER IF EXISTS');
    expect(sql).toContain('DROP FUNCTION IF EXISTS');
    expect(sql).not.toContain('DROP TABLE');
  });
});
