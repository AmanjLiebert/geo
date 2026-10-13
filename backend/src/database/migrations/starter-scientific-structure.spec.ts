import { describe, expect, it } from 'vitest';
import { STARTER_CATEGORIES, STARTER_TYPES } from './1790640000000-starter-scientific-structure';

describe('starter scientific structure catalog', () => {
  it('contains unique stable keys, six heading categories, and seventeen selectable subcategories', () => {
    const keys = STARTER_CATEGORIES.map((category) => category.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(STARTER_CATEGORIES.filter((category) => !category.parent)).toHaveLength(6);
    expect(STARTER_CATEGORIES.filter((category) => category.parent)).toHaveLength(17);
    expect(STARTER_CATEGORIES.filter((category) => !category.parent && category.types)).toEqual([]);

    const seen = new Set<string>();
    for (const category of STARTER_CATEGORIES) {
      if (category.parent) {
        expect(seen.has(category.parent)).toBe(true);
        expect(category.types?.length).toBeGreaterThan(0);
      }
      seen.add(category.key);
    }
  });

  it('binds only defined record types with nonempty, unique scientific fields', () => {
    const typeKeys = STARTER_TYPES.map((type) => type.key);
    expect(new Set(typeKeys).size).toBe(typeKeys.length);
    const knownTypes = new Set(typeKeys);

    for (const type of STARTER_TYPES) {
      expect(type.fields.length).toBeGreaterThan(0);
      expect(type.fields.some((field) => field.required)).toBe(true);
      expect(new Set(type.fields.map((field) => field.key)).size).toBe(type.fields.length);
    }
    for (const category of STARTER_CATEGORIES) {
      for (const key of category.types ?? []) expect(knownTypes.has(key)).toBe(true);
    }
  });
});
