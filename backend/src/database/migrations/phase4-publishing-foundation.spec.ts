import { describe, expect, it, vi } from 'vitest';
import { QueryRunner } from 'typeorm';
import { Phase4PublishingFoundation1790539200000 } from './1790539200000-phase4-publishing-foundation';

describe('Phase 4 publishing foundation migration', () => {
  it('creates private media, exact/public geography, evidence, research and editorial structures', async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    await new Phase4PublishingFoundation1790539200000().up({ query } as unknown as QueryRunner);
    const sql = query.mock.calls.map((call) => String(call[0])).join('\n');
    expect(sql).toContain('CREATE TABLE "record_evidence"');
    expect(sql).toContain('CREATE TABLE "record_locations"');
    expect(sql).toContain('CREATE VIEW "public_record_locations"');
    expect(sql).toContain('CREATE TABLE "media_assets"');
    expect(sql).toContain('CREATE TABLE "research_publications"');
    expect(sql).toContain('CREATE TABLE "news_articles"');
    expect(sql).toContain('CREATE TABLE "managed_pages"');
    expect(sql).toContain('enforce_scientific_record_publication');
    expect(sql).toContain('reviewed_by_user_id = NEW.owner_user_id');
  });
});
