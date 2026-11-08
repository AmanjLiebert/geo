import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { PublicScientificContentService } from './public-scientific-content.service';

const publicId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const recordId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function recordRow() {
  return {
    record_id: recordId,
    public_id: publicId,
    slug: 'sample-record',
    title: 'Sample record',
    summary: 'A public geological summary.',
    description: 'A public geological description.',
    category_slug: 'rocks',
    category_name: 'Rocks',
    record_type_name: 'Rock specimen',
    published_at: new Date('2026-10-01T00:00:00.000Z'),
    updated_at: new Date('2026-10-02T00:00:00.000Z'),
    image_ready: true,
    image_caption: 'Field specimen',
    image_description: 'A documented specimen.',
    image_alt_text: 'Layered grey rock specimen',
    image_licence: 'CC BY 4.0',
    image_credit: 'Geo-Kurdistan',
  };
}

describe('PublicScientificContentService', () => {
  it('returns only a minimal published category projection', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        {
          slug: 'rocks',
          parent_slug: null,
          records_allowed: false,
          name: 'Rocks',
          summary: 'Rock collections',
          description: 'Published rock collections.',
          record_count: '3',
          image_ready: true,
        },
      ])
      .mockResolvedValueOnce([{ total: '1' }]);
    const service = new PublicScientificContentService({ query } as unknown as DataSource);

    const result = await service.listCategories('en', 20, 0);

    expect(result).toEqual({
      items: [
        {
          slug: 'rocks',
          parentSlug: null,
          name: 'Rocks',
          summary: 'Rock collections',
          description: 'Published rock collections.',
          recordsAllowed: false,
          recordCount: 3,
          locale: 'en',
          image: {
            viewEndpoint: '/api/v1/public/scientific/categories/rocks/image',
          },
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    });
    const sql = query.mock.calls[0]?.[0] as string;
    expect(sql).toContain("c.status = 'active'");
    expect(sql).toContain("c.publication_status = 'published'");
    expect(sql).toContain("rt.status = 'published'");
    expect(sql).not.toContain('storage_key');
    expect(sql).not.toContain('owner_user_id');
  });

  it('returns neutral not-found for a hidden category', async () => {
    const service = new PublicScientificContentService({
      query: vi.fn().mockResolvedValue([]),
    } as unknown as DataSource);
    await expect(service.getCategory('hidden-category')).rejects.toThrow(NotFoundException);
  });

  it('filters records through published descendants and returns no internal record id', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([recordRow()])
      .mockResolvedValueOnce([{ total: '1' }]);
    const service = new PublicScientificContentService({ query } as unknown as DataSource);

    const result = await service.listRecords('en', 20, 0, 'rocks');

    expect(result.items[0]).toEqual({
      publicId,
      slug: 'sample-record',
      title: 'Sample record',
      summary: 'A public geological summary.',
      category: { slug: 'rocks', name: 'Rocks' },
      recordType: 'Rock specimen',
      locale: 'en',
      publishedAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-02T00:00:00.000Z',
      image: {
        viewEndpoint: `/api/v1/public/scientific/records/${publicId}/image`,
        caption: 'Field specimen',
        description: 'A documented specimen.',
        altText: 'Layered grey rock specimen',
        licence: 'CC BY 4.0',
        credit: 'Geo-Kurdistan',
      },
    });
    expect(result.items[0]).not.toHaveProperty('recordId');
    const sql = query.mock.calls[0]?.[0] as string;
    expect(sql).toContain('WITH RECURSIVE selected_categories');
    expect(sql).toContain("t.status = 'published'");
    expect(sql).toContain("r.status = 'published'");
    expect(sql).not.toContain('owner_user_id');
  });

  it('returns labelled fields, public-safe locations, and attached references', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([recordRow()])
      .mockResolvedValueOnce([{ label: 'Hardness', data_type: 'decimal', unit: null, value: 7 }])
      .mockResolvedValueOnce([
        {
          label: null,
          visibility: 'region_only',
          region_label: 'Erbil Governorate',
          public_precision_metres: null,
          geometry: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          source_type: 'journal',
          authors: ['A. Geologist', 42],
          title: 'Regional geology',
          publication: 'Geology Journal',
          publication_year: 2025,
          identifier: 'doi:example',
          pages_or_figure: '12–14',
          source_url: 'https://example.org/paper',
          rights_statement: 'Citation permitted',
          evidence_kind: 'identification',
        },
      ]);
    const service = new PublicScientificContentService({ query } as unknown as DataSource);

    const result = await service.getRecord(publicId);

    expect(result.fields).toEqual([
      { label: 'Hardness', dataType: 'decimal', unit: null, value: 7 },
    ]);
    expect(result.locations).toEqual([
      {
        label: null,
        visibility: 'region_only',
        regionLabel: 'Erbil Governorate',
        precisionMetres: null,
        geometry: null,
      },
    ]);
    expect(result.references[0]?.authors).toEqual(['A. Geologist']);
    const locationSql = query.mock.calls[2]?.[0] as string;
    const referenceSql = query.mock.calls[3]?.[0] as string;
    expect(locationSql).toContain('FROM public_record_locations');
    expect(locationSql).toContain("visibility IN ('public', 'approximate')");
    expect(locationSql).not.toContain('exact_geometry');
    expect(locationSql).not.toContain('sensitivity_reason');
    expect(referenceSql).not.toContain('verification_status');
    expect(referenceSql).not.toContain('reviewer_notes');
    expect(referenceSql).not.toContain('created_by_user_id');
  });

  it('checks publication and approval before resolving public image assets', async () => {
    const query = vi.fn().mockResolvedValueOnce([{ id: 'image-1' }]);
    const service = new PublicScientificContentService({ query } as unknown as DataSource);

    await expect(service.getRecordImageAssetId(publicId)).resolves.toBe('image-1');
    const sql = query.mock.calls[0]?.[0] as string;
    expect(sql).toContain("r.status = 'published'");
    expect(sql).toContain("c.publication_status = 'published'");
    expect(sql).toContain('rm.is_primary = true');
    expect(sql).toContain("m.processing_status = 'approved'");
    expect(sql).not.toContain('storage_key');
  });

  it('does not issue a public image ticket when current eligibility fails', async () => {
    const service = new PublicScientificContentService({
      query: vi.fn().mockResolvedValue([]),
    } as unknown as DataSource);
    await expect(service.getCategoryImageAssetId('rocks')).rejects.toThrow(NotFoundException);
  });
});
