import { describe, expect, it, vi } from 'vitest';
import { QueryRunner } from 'typeorm';
import { ReviewIntegrity1790542800000 } from './1790542800000-review-integrity';

describe('review integrity migration', () => {
  it('enforces independent translation and publication review in PostgreSQL', async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    await new ReviewIntegrity1790542800000().up({ query } as unknown as QueryRunner);
    const sql = query.mock.calls.map((call) => String(call[0])).join('\n');
    expect(sql).toContain('enforce_independent_translation_review');
    expect(sql).toContain('enforce_research_publication');
    expect(sql).toContain('enforce_news_publication');
    expect(sql).toContain('enforce_managed_page_publication');
    expect(sql).toContain('reviewer_user_id IS NOT DISTINCT FROM NEW.translator_user_id');
  });
});
