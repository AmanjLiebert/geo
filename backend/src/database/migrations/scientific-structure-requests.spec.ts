import { QueryRunner } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { ScientificStructureRequests1790452800000 } from './1790452800000-scientific-structure-requests';

describe('scientific structure requests migration', () => {
  it('stores provisional requests without changing canonical taxonomy', async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    const runner = { query } as unknown as QueryRunner;

    await new ScientificStructureRequests1790452800000().up(runner);

    const sql = query.mock.calls.map((call) => String(call[0])).join('\n');
    expect(sql).toContain('CREATE TABLE "scientific_structure_requests"');
    expect(sql).toContain('ck_scientific_structure_requests_proposal');
    expect(sql).toContain("'pending', 'reviewed', 'accepted', 'rejected'");
  });
});
