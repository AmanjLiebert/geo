/* eslint-disable @typescript-eslint/require-await -- Async fakes model owner-service promise contracts. */
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(path.resolve('package.json'));
interface SeedApi {
  loadBundle(directory: string): Promise<{
    categories: Array<{ description: string; summary: string }>;
    records: Array<{ slug: string; image: string; description: string }>;
    images: Map<string, { sha256: string }>;
  }>;
  preflight(
    db: unknown,
    bundle: unknown,
  ): Promise<{ categories: Map<string, unknown>; bindings: Map<string, unknown> }>;
  seedCategory(ctx: unknown, profile: unknown, category: unknown): Promise<boolean>;
  seedRecord(ctx: unknown, record: unknown, binding: unknown): Promise<boolean>;
  ensureImage(ctx: unknown, image: unknown): Promise<string>;
  withTransaction(db: unknown, body: unknown): Promise<unknown>;
}
const seed = require('./scripts/seed-teacher-content.cjs') as SeedApi;

describe('teacher content seed bundle', () => {
  it('packages exactly the six cleaned profiles, ten sourced records and ten unique record images', async () => {
    const bundle = await seed.loadBundle(path.resolve('assets/teacher-content-v1'));
    expect(bundle.categories).toHaveLength(6);
    expect(bundle.records).toHaveLength(10);
    expect(bundle.images.size).toBe(14);
    expect(
      new Set(bundle.records.map((r: { image: string }) => bundle.images.get(r.image)?.sha256))
        .size,
    ).toBe(10);
    for (const category of bundle.categories) {
      expect(category.description).not.toMatch(/https?:|CC BY|Source:|Image:/);
      expect(category.summary.length).toBeGreaterThan(20);
    }
    expect(
      bundle.records.find((r: { slug: string }) => r.slug === 'erbil-trilobite-fossil')
        ?.description,
    ).toMatch(/not|unknown/i);
  });

  it('preflight reads only and preserves a fresh migration-created target', async () => {
    const bundle = await seed.loadBundle(path.resolve('assets/teacher-content-v1'));
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('FROM users')) return [{ id: 'actor' }];
      if (sql.includes('c.parent_id IS NULL'))
        return [
          {
            id: 'cat',
            position: 0,
            name: 'Category',
            summary: null,
            description: null,
            image_media_asset_id: null,
            has_draft: false,
          },
        ];
      if (sql.includes('category_record_types'))
        return [{ category_id: 'cat', record_type_id: 'type' }];
      if (sql.includes('scientific_records')) return [];
      throw new Error('Unexpected SQL');
    });
    const plan = await seed.preflight({ query }, bundle);
    expect(plan.categories.size).toBe(6);
    expect(plan.bindings.size).toBe(10);
    for (const [sql] of query.mock.calls) expect(sql.trim()).toMatch(/^SELECT/);
  });

  it.each(['draft', 'content'])(
    'refuses existing category %s before any writes',
    async (conflict) => {
      const query = vi
        .fn()
        .mockResolvedValueOnce([{ id: 'actor' }])
        .mockResolvedValueOnce([
          {
            id: 'cat',
            has_draft: conflict === 'draft',
            summary: conflict === 'content' ? 'User edit' : null,
          },
        ]);
      await expect(
        seed.preflight({ query }, { categories: [{ slug: 'fossils' }], records: [] }),
      ).rejects.toThrow(/preserved/i);
      expect(query).toHaveBeenCalledTimes(2);
    },
  );

  it('rerunning existing published items makes no service, image or database calls', async () => {
    const ctx = { db: { query: vi.fn() }, image: vi.fn(), services: vi.fn() };
    expect(await seed.seedCategory(ctx, {}, { skip: true })).toBe(false);
    expect(await seed.seedRecord(ctx, {}, { skip: true })).toBe(false);
    expect(ctx.db.query).not.toHaveBeenCalled();
    expect(ctx.image).not.toHaveBeenCalled();
    expect(ctx.services).not.toHaveBeenCalled();
  });

  it('keeps nested owner-service queries and transactions inside the outer transaction', async () => {
    const manager = {
      query: vi.fn<(...args: unknown[]) => Promise<unknown[]>>().mockResolvedValue(['inside']),
    };
    const db = {
      query: vi.fn(),
      transaction: vi.fn(
        async (
          body: (manager: { query: (...args: unknown[]) => Promise<unknown> }) => Promise<unknown>,
        ) => body(manager),
      ),
    };
    expect(
      await seed.withTransaction(db, async (scoped: typeof db) => {
        await scoped.query();
        return scoped.transaction(
          async (nested: { query: (...args: unknown[]) => Promise<unknown> }) => nested.query(),
        );
      }),
    ).toEqual(['inside']);
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(db.query).not.toHaveBeenCalled();
    expect(manager.query).toHaveBeenCalledTimes(2);
  });

  it('refuses publication if image processing did not approve the content', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ metadata: { mediaId: 'media', sha256: 'hash' } }])
      .mockResolvedValueOnce([{ id: 'media', owner_user_id: 'actor', processing_status: 'failed' }])
      .mockResolvedValueOnce([]);
    const ctx = { actor: 'actor', db: { query }, processor: { process: vi.fn() }, verify: vi.fn() };
    await expect(seed.ensureImage(ctx, { key: 'image', sha256: 'hash' })).rejects.toThrow(
      /did not pass scanning/,
    );
    expect(ctx.processor.process).toHaveBeenCalledWith('media');
    expect(ctx.verify).not.toHaveBeenCalled();
  });

  it('does not confirm or upload approved image checkpoints and checks stored derivatives', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ metadata: { mediaId: 'media', sha256: 'hash' } }])
      .mockResolvedValueOnce([
        { id: 'media', owner_user_id: 'actor', processing_status: 'approved' },
      ])
      .mockResolvedValueOnce([{ id: 'media' }])
      .mockResolvedValueOnce([{ storage_key: 'derivative' }]);
    const ctx = {
      actor: 'actor',
      db: { query },
      processor: { process: vi.fn() },
      media: { confirm: vi.fn() },
      upload: vi.fn(),
      verify: vi.fn(),
    };
    expect(await seed.ensureImage(ctx, { key: 'image', sha256: 'hash' })).toBe('media');
    expect(ctx.processor.process).not.toHaveBeenCalled();
    expect(ctx.upload).not.toHaveBeenCalled();
    expect(ctx.media.confirm).not.toHaveBeenCalled();
    expect(ctx.verify).toHaveBeenCalledWith('derivative');
  });

  it('propagates publication failure to roll back record creation, sources and import checkpoint', async () => {
    const manager = {
      query: vi.fn<(...args: unknown[]) => Promise<unknown[]>>().mockResolvedValue([]),
    };
    const db = {
      transaction: vi.fn(
        async (
          body: (manager: { query: (...args: unknown[]) => Promise<unknown> }) => Promise<unknown>,
        ) => body(manager),
      ),
    };
    const records = {
      create: vi.fn(async () => ({ id: 'record' })),
      upsertTranslation: vi.fn(),
      submitForReview: vi.fn(),
      publish: vi.fn().mockRejectedValue(new Error('readiness failed')),
    };
    const trust = {
      createReference: vi.fn(async () => ({ id: 'reference' })),
      addEvidence: vi.fn(),
    };
    const media = { attachToRecord: vi.fn() };
    const ctx = {
      db,
      actor: 'actor',
      image: vi.fn(async () => 'image'),
      services: () => ({ records, trust, media }),
    };
    await expect(
      seed.seedRecord(
        ctx,
        {
          slug: 'record',
          attributes: {},
          image: 'image',
          sources: [{ type: 'website', title: 'Evidence', url: 'https://example.org' }],
        },
        {},
      ),
    ).rejects.toThrow('readiness failed');
    expect(records.submitForReview).toHaveBeenCalledOnce();
    expect(
      manager.query.mock.calls.some(([sql]) =>
        String(sql).includes('INSERT INTO content_audit_events'),
      ),
    ).toBe(false); // No completed-import marker after failure.
  });
});
