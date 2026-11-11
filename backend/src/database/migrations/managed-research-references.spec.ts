import { describe, expect, it, vi } from 'vitest';
import { QueryRunner } from 'typeorm';
import { ManagedResearchReferences1790546400000 } from './1790546400000-managed-research-references';

describe('managed research reference migration', () => {
  it('makes a managed research publication a traceable reference target', async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    await new ManagedResearchReferences1790546400000().up({ query } as unknown as QueryRunner);
    const sql = query.mock.calls.map((call) => String(call[0])).join('\n');
    expect(sql).toContain('research_publication_id');
    expect(sql).toContain('ck_scientific_references_traceable');
  });
});
