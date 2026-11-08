import { describe, expect, it, vi } from 'vitest';
import { TrustedAuthorEvidence1792478400000 } from './1792478400000-trusted-author-evidence';

describe('TrustedAuthorEvidence1792478400000', () => {
  it('counts attached references without requiring a verification state', async () => {
    const query = vi.fn<(sql: string) => Promise<void>>(() => Promise.resolve());
    await new TrustedAuthorEvidence1792478400000().up({ query } as never);
    const sql = query.mock.calls.map(([value]) => value).join('\n');
    expect(sql).toContain('count(DISTINCT e.reference_id)');
    expect(sql).not.toContain("verification_status = 'verified'");
    expect(sql).toContain('Published records do not satisfy the reference policy');
  });

  it('restores the prior verified-reference rule on rollback', async () => {
    const query = vi.fn<(sql: string) => Promise<void>>(() => Promise.resolve());
    await new TrustedAuthorEvidence1792478400000().down({ query } as never);
    const sql = query.mock.calls.map(([value]) => value).join('\n');
    expect(sql).toContain("verification_status = 'verified'");
  });
});
