import { describe, expect, it } from 'vitest';
import {
  CURATED_IMAGE_SOURCES,
  CURATED_SCIENTIFIC_RECORDS,
  stableCatalogUuid,
} from './curated-scientific-catalog';

describe('curated scientific catalog', () => {
  it('contains exactly 36 unique unpublished review records', () => {
    expect(CURATED_SCIENTIFIC_RECORDS).toHaveLength(36);
    expect(new Set(CURATED_SCIENTIFIC_RECORDS.map((record) => record.key)).size).toBe(36);
  });

  it('uses only traceable images with licence and creator metadata', () => {
    const sources = new Map(CURATED_IMAGE_SOURCES.map((source) => [source.key, source]));
    for (const record of CURATED_SCIENTIFIC_RECORDS) {
      const source = sources.get(record.image);
      expect(source).toBeDefined();
      expect(source?.sourceUrl).toMatch(/^https:\/\//);
      expect(source?.creator.trim()).toBeTruthy();
      expect(source?.licence.trim()).toBeTruthy();
      expect(record.imageAltText.trim().length).toBeGreaterThanOrEqual(5);
    }
  });

  it('never seeds measurements, dates, ages, coordinates, or published claims', () => {
    for (const record of CURATED_SCIENTIFIC_RECORDS) {
      expect(record.attributes).not.toHaveProperty('total_thickness_m');
      expect(record.attributes).not.toHaveProperty('observed_on');
      expect(record.attributes).not.toHaveProperty('value');
      expect(record.attributes).not.toHaveProperty('geologic_age');
      expect(record.description).toMatch(/traceable|licensed/i);
      expect(`${record.title} ${record.summary} ${record.description}`).not.toMatch(
        /development draft|unpublished teaching|teacher must review/i,
      );
    }
  });

  it('derives stable task-owned UUIDs', () => {
    expect(stableCatalogUuid('record:shanidar-cave')).toBe(
      stableCatalogUuid('record:shanidar-cave'),
    );
    expect(stableCatalogUuid('record:shanidar-cave')).not.toBe(
      stableCatalogUuid('record:different-record'),
    );
  });
});
