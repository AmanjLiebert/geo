import { QueryRunner } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { UsedTemplateImmutability1790449200000 } from './1790449200000-used-template-immutability';

describe('used template immutability migration', () => {
  it('protects active and record-pinned versions while allowing unused draft maintenance', async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    const runner = { query } as unknown as QueryRunner;

    await new UsedTemplateImmutability1790449200000().up(runner);

    const sql = query.mock.calls.map((call) => String(call[0])).join('\n');
    expect(sql).toContain('Active or used template versions cannot be deleted');
    expect(sql).toContain("OLD.status = 'active' OR has_records");
    expect(sql).toContain('scientific_records WHERE template_version_id');
    expect(sql).toContain('active or used template version are immutable');
  });
});
