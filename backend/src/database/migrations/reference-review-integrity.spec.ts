import { describe, expect, it, vi } from 'vitest';
import { QueryRunner } from 'typeorm';
import { ReferenceReviewIntegrity1790550000000 } from './1790550000000-reference-review-integrity';

describe('reference review integrity migration', () => {
  it('requires a different source creator and verifier', async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    await new ReferenceReviewIntegrity1790550000000().up({ query } as unknown as QueryRunner);
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('verified_by_user_id');
    expect(sql).toContain('<> "created_by_user_id"');
  });
});
