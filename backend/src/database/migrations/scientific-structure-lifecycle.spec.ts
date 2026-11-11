import { QueryRunner } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { ScientificStructureLifecycle1790643600000 } from './1790643600000-scientific-structure-lifecycle';

describe('scientific structure lifecycle migration', () => {
  it('guards cycles, stable keys, unsafe archival, and mismatched active templates', async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    await new ScientificStructureLifecycle1790643600000().up({ query } as unknown as QueryRunner);
    const sql = query.mock.calls.map((call) => String(call[0])).join('\n');

    expect(sql).toContain('WITH RECURSIVE ancestors');
    expect(sql).toContain('NEW.stable_key IS DISTINCT FROM OLD.stable_key');
    expect(sql).toContain("status <> 'archived'");
    expect(sql).toContain("OLD.status = 'active' AND NEW.status = 'archived'");
    expect(sql).toContain('t.record_type_id = NEW.record_type_id');
    expect(sql).toContain("tv.status = 'active'");
    expect(sql).toContain('BEFORE INSERT OR UPDATE OR DELETE ON category_record_types');
  });
});
