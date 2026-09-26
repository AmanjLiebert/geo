import { QueryRunner } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { ScientificContentFoundation1790442000000 } from './1790442000000-scientific-content-foundation';

describe('scientific content foundation migration', () => {
  it('creates configurable structure, versioned templates, zero-record storage, and recovery history', async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    const runner = { query } as unknown as QueryRunner;

    await new ScientificContentFoundation1790442000000().up(runner);

    const sql = query.mock.calls.map((call) => String(call[0])).join('\n');
    expect(sql).toContain('CREATE TABLE "categories"');
    expect(sql).toContain('CREATE TABLE "record_types"');
    expect(sql).toContain('CREATE TABLE "template_versions"');
    expect(sql).toContain('CREATE TABLE "field_definitions"');
    expect(sql).toContain('CREATE TABLE "category_record_types"');
    expect(sql).toContain('CREATE TABLE "scientific_records"');
    expect(sql).toContain('CREATE TABLE "record_translations"');
    expect(sql).toContain('CREATE TABLE "record_revisions"');
    expect(sql).toContain('CREATE TABLE "saved_records"');
    expect(sql).toContain('prevent_active_template_version_mutation');
    expect(sql).not.toContain('INSERT INTO "scientific_records"');
  });
});
