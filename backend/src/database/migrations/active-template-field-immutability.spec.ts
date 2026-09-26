import { QueryRunner } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { ActiveTemplateFieldImmutability1790445600000 } from './1790445600000-active-template-field-immutability';

describe('active template field immutability migration', () => {
  it('protects fields and field translations once a template version is active', async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    const runner = { query } as unknown as QueryRunner;

    await new ActiveTemplateFieldImmutability1790445600000().up(runner);

    const sql = query.mock.calls.map((call) => String(call[0])).join('\n');
    expect(sql).toContain('prevent_active_template_field_mutation');
    expect(sql).toContain('BEFORE INSERT OR UPDATE OR DELETE ON "field_definitions"');
    expect(sql).toContain('prevent_active_template_field_translation_mutation');
    expect(sql).toContain('BEFORE INSERT OR UPDATE OR DELETE ON "field_definition_translations"');
  });
});
