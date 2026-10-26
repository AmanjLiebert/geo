import { describe, expect, it, vi } from 'vitest';
import { QueryRunner } from 'typeorm';
import { RecordOwnerPublication1792392000000 } from './1792392000000-record-owner-publication';

describe('record owner publication migration', () => {
  it('removes only the record separation-of-duties trigger and preserves readiness checks', async () => {
    const query = vi.fn().mockResolvedValue([]);
    await new RecordOwnerPublication1792392000000().up({ query } as unknown as QueryRunner);
    const sql = query.mock.calls.map(([statement]) => String(statement)).join('\n');

    expect(sql).toContain('DROP TRIGGER IF EXISTS "trg_record_translations_independent_review"');
    expect(sql).not.toContain('trg_research_translations_independent_review');
    expect(sql).not.toContain('trg_news_translations_independent_review');
    expect(sql).toContain('NEW.reviewed_by_user_id IS NULL');
    expect(sql).not.toContain('NEW.reviewed_by_user_id = NEW.owner_user_id');
    expect(sql).toContain('t.reviewer_user_id IS NOT NULL');
    expect(sql).not.toContain('t.reviewer_user_id IS DISTINCT FROM t.translator_user_id');
    expect(sql).toContain('verified-reference policy');
    expect(sql).toContain('invalid public location policy');
    expect(sql).toContain("m.processing_status <> 'approved'");
    expect(sql).toContain("c.publication_status = 'published'");
    expect(sql).toContain('rm.is_primary = true');
    expect(sql).toContain('m.rights_statement');
    expect(sql).toContain('rm.alt_text');
  });

  it('restores the former record-only independent-review enforcement on rollback', async () => {
    const query = vi.fn().mockResolvedValue([]);
    await new RecordOwnerPublication1792392000000().down({ query } as unknown as QueryRunner);
    const sql = query.mock.calls.map(([statement]) => String(statement)).join('\n');

    expect(sql).toContain('NEW.reviewed_by_user_id = NEW.owner_user_id');
    expect(sql).toContain('reviewer_user_id IS DISTINCT FROM translator_user_id');
    expect(sql).toContain('t.reviewer_user_id IS DISTINCT FROM t.translator_user_id');
    expect(sql).toContain('CREATE TRIGGER "trg_record_translations_independent_review"');
    expect(sql).not.toContain('DROP TABLE');
  });
});
