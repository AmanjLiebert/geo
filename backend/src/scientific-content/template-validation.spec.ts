import { describe, expect, it } from 'vitest';
import { FieldDataType, FieldDefinition } from './scientific-content.types';
import { applyFieldMapping, validateAttributes } from './template-validation';

const fields: FieldDefinition[] = [
  {
    stableKey: 'scientific_name',
    dataType: FieldDataType.TEXT,
    required: true,
    validation: { minLength: 3, maxLength: 80 },
    status: 'active',
  },
  {
    stableKey: 'age_ma',
    dataType: FieldDataType.DECIMAL,
    required: false,
    validation: { minimum: 0, maximum: 4_600 },
    status: 'active',
  },
];

describe('template validation', () => {
  it('allows an incomplete draft but reports required fields during full validation', () => {
    expect(validateAttributes(fields, {}, false)).toEqual([]);
    expect(validateAttributes(fields, {}, true)).toEqual([
      expect.objectContaining({ field: 'scientific_name', code: 'required' }),
    ]);
  });

  it('rejects unknown, mistyped, and out-of-range attributes', () => {
    const issues = validateAttributes(
      fields,
      { scientific_name: 12, age_ma: 5_000, invented: true },
      true,
    );
    expect(issues.map((item) => item.code)).toEqual(['unknown', 'type', 'maximum']);
  });

  it('maps a preview without mutating the source attributes', () => {
    const source = { former_name: 'Trilobite', ignored: 'x' };
    const mapped = applyFieldMapping(source, fields, {
      former_name: 'scientific_name',
      ignored: null,
    });
    expect(mapped).toEqual({ scientific_name: 'Trilobite' });
    expect(source).toEqual({ former_name: 'Trilobite', ignored: 'x' });
  });
});
