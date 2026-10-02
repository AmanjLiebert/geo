import { describe, expect, it, vi } from 'vitest';
import { DataSource } from 'typeorm';
import { hasPermission, Permission, UserRole } from '../identity/access-control';
import { REQUIRED_PERMISSIONS_KEY } from '../identity/access.decorators';
import { EditorialController } from './editorial.controller';
import { EditorialService } from './editorial.service';

describe('Editorial service and controller', () => {
  describe('EditorialController permissions', () => {
    it('protects listNews with MANAGE_NEWS permission', () => {
      const listNewsFn = Object.getOwnPropertyDescriptor(EditorialController.prototype, 'listNews')
        ?.value as (...args: unknown[]) => unknown;
      const permissions = Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, listNewsFn) as Permission[];
      expect(permissions).toEqual([Permission.MANAGE_NEWS]);
    });

    it('protects listPages with MANAGE_SITE_CONTENT permission', () => {
      const listPagesFn = Object.getOwnPropertyDescriptor(
        EditorialController.prototype,
        'listPages',
      )?.value as (...args: unknown[]) => unknown;
      const permissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        listPagesFn,
      ) as Permission[];
      expect(permissions).toEqual([Permission.MANAGE_SITE_CONTENT]);
    });

    it('allows admin role for editorial permissions and denies teacher and visitor', () => {
      // MANAGE_NEWS
      expect(hasPermission(UserRole.ADMIN, Permission.MANAGE_NEWS)).toBe(true);
      expect(hasPermission(UserRole.TEACHER, Permission.MANAGE_NEWS)).toBe(false);
      expect(hasPermission(UserRole.VISITOR, Permission.MANAGE_NEWS)).toBe(false);

      // MANAGE_SITE_CONTENT
      expect(hasPermission(UserRole.ADMIN, Permission.MANAGE_SITE_CONTENT)).toBe(true);
      expect(hasPermission(UserRole.TEACHER, Permission.MANAGE_SITE_CONTENT)).toBe(false);
      expect(hasPermission(UserRole.VISITOR, Permission.MANAGE_SITE_CONTENT)).toBe(false);
    });
  });

  describe('EditorialService.listNews', () => {
    it('uses an explicit minimal projection in SQL and never selects n.*', async () => {
      let capturedListSql = '';
      const queryMock = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve([{ total: '1' }]);
        }
        capturedListSql = sql;
        return Promise.resolve([
          {
            id: 'news-1',
            slug: 'new-discovery',
            status: 'published',
            published_at: new Date('2026-04-01T10:00:00Z'),
            updated_at: new Date('2026-04-02T12:00:00Z'),
            title: 'New Zagros Discovery',
          },
        ]);
      });

      const dataSource = { query: queryMock } as unknown as DataSource;
      const service = new EditorialService(dataSource);

      const result = await service.listNews(20, 0);

      expect(capturedListSql).not.toMatch(/SELECT\s+n\.\*/i);
      expect(capturedListSql).not.toMatch(/SELECT\s+\*/i);

      expect(capturedListSql).toContain('n.id');
      expect(capturedListSql).toContain('n.slug');
      expect(capturedListSql).toContain('n.status');
      expect(capturedListSql).toContain('n.published_at');
      expect(capturedListSql).toContain('n.updated_at');
      expect(capturedListSql).toContain('t.headline AS title');

      expect(result.items).toHaveLength(1);
    });

    it('returns items containing exactly id, title, slug, status, publishedAt, updatedAt', async () => {
      const queryMock = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve([{ total: '2' }]);
        }
        return Promise.resolve([
          {
            id: 'news-pub',
            slug: 'geological-survey-2026',
            status: 'published',
            published_at: new Date('2026-05-10T09:00:00.000Z'),
            updated_at: new Date('2026-05-10T09:00:00.000Z'),
            title: '2026 Field Survey Begins',
          },
          {
            id: 'news-draft',
            slug: null,
            status: 'draft',
            published_at: null,
            updated_at: new Date('2026-05-11T14:30:00.000Z'),
            title: null,
          },
        ]);
      });

      const dataSource = { query: queryMock } as unknown as DataSource;
      const service = new EditorialService(dataSource);

      const result = await service.listNews(10, 0);
      expect(result.items).toHaveLength(2);

      const [firstItem, secondItem] = result.items;
      expect(firstItem).toBeDefined();
      expect(secondItem).toBeDefined();
      if (!firstItem || !secondItem) throw new Error('Expected items');

      expect(Object.keys(firstItem).sort()).toEqual(
        ['id', 'publishedAt', 'slug', 'status', 'title', 'updatedAt'].sort(),
      );
      expect(firstItem).toEqual({
        id: 'news-pub',
        title: '2026 Field Survey Begins',
        slug: 'geological-survey-2026',
        status: 'published',
        publishedAt: '2026-05-10T09:00:00.000Z',
        updatedAt: '2026-05-10T09:00:00.000Z',
      });

      expect(Object.keys(secondItem).sort()).toEqual(
        ['id', 'publishedAt', 'slug', 'status', 'title', 'updatedAt'].sort(),
      );
      expect(secondItem).toEqual({
        id: 'news-draft',
        title: null,
        slug: null,
        status: 'draft',
        publishedAt: null,
        updatedAt: '2026-05-11T14:30:00.000Z',
      });
    });

    it('ensures sensitive, internal, and unnecessary fields are absent from news items', async () => {
      const queryMock = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve([{ total: '1' }]);
        }
        return Promise.resolve([
          {
            id: 'news-clean',
            slug: 'sample',
            status: 'draft',
            published_at: null,
            updated_at: new Date('2026-01-01T00:00:00Z'),
            title: 'Draft Article',
          },
        ]);
      });

      const dataSource = { query: queryMock } as unknown as DataSource;
      const service = new EditorialService(dataSource);

      const result = await service.listNews(20, 0);
      const [item] = result.items;
      expect(item).toBeDefined();
      if (!item) throw new Error('Expected item');

      expect(item).not.toHaveProperty('author_user_id');
      expect(item).not.toHaveProperty('authorUserId');
      expect(item).not.toHaveProperty('reviewed_by_user_id');
      expect(item).not.toHaveProperty('reviewedByUserId');
      expect(item).not.toHaveProperty('tags');
      expect(item).not.toHaveProperty('source_links');
      expect(item).not.toHaveProperty('sourceLinks');
      expect(item).not.toHaveProperty('stable_id');
      expect(item).not.toHaveProperty('stableId');
      expect(item).not.toHaveProperty('created_at');
      expect(item).not.toHaveProperty('createdAt');
      expect(item).not.toHaveProperty('body');
    });

    it('filters news by status using parameterized queries for both data and count', async () => {
      const capturedCalls: Array<{ sql: string; params: unknown[] }> = [];
      const queryMock = vi.fn().mockImplementation((sql: string, params: unknown[]) => {
        capturedCalls.push({ sql, params });
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve([{ total: '3' }]);
        }
        return Promise.resolve([]);
      });

      const dataSource = { query: queryMock } as unknown as DataSource;
      const service = new EditorialService(dataSource);

      const result = await service.listNews(25, 10, 'in_review');

      expect(capturedCalls).toHaveLength(2);

      const [listCall, countCall] = capturedCalls;
      expect(listCall).toBeDefined();
      expect(countCall).toBeDefined();
      if (!listCall || !countCall) throw new Error('Expected captured calls');

      expect(listCall.sql).toContain('WHERE n.status = $3');
      expect(listCall.sql).not.toContain("'in_review'");
      expect(listCall.params).toEqual([25, 10, 'in_review']);

      expect(countCall.sql).toContain('WHERE n.status = $1');
      expect(countCall.sql).not.toContain("'in_review'");
      expect(countCall.params).toEqual(['in_review']);

      expect(result.total).toBe(3);
      expect(result.limit).toBe(25);
      expect(result.offset).toBe(10);
    });

    it('omits news status filter parameter when status is undefined', async () => {
      const capturedCalls: Array<{ sql: string; params: unknown[] }> = [];
      const queryMock = vi.fn().mockImplementation((sql: string, params: unknown[]) => {
        capturedCalls.push({ sql, params });
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve([{ total: '0' }]);
        }
        return Promise.resolve([]);
      });

      const dataSource = { query: queryMock } as unknown as DataSource;
      const service = new EditorialService(dataSource);

      await service.listNews(20, 0);

      expect(capturedCalls).toHaveLength(2);

      const [listCall, countCall] = capturedCalls;
      expect(listCall).toBeDefined();
      expect(countCall).toBeDefined();
      if (!listCall || !countCall) throw new Error('Expected captured calls');

      expect(listCall.sql).not.toContain('WHERE n.status');
      expect(listCall.params).toEqual([20, 0]);

      expect(countCall.sql).not.toContain('WHERE n.status');
      expect(countCall.params).toEqual([]);
    });

    it('returns valid empty state when database contains zero news articles', async () => {
      const queryMock = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve([{ total: '0' }]);
        }
        return Promise.resolve([]);
      });

      const dataSource = { query: queryMock } as unknown as DataSource;
      const service = new EditorialService(dataSource);

      const result = await service.listNews(20, 0);

      expect(result).toEqual({
        items: [],
        total: 0,
        limit: 20,
        offset: 0,
      });
    });

    it('clamps limit to 1..100 and clamps negative offset to 0 for news', async () => {
      const queryMock = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve([{ total: '0' }]);
        }
        return Promise.resolve([]);
      });

      const dataSource = { query: queryMock } as unknown as DataSource;
      const service = new EditorialService(dataSource);

      const result = await service.listNews(200, -10);

      expect(result.limit).toBe(100);
      expect(result.offset).toBe(0);

      const firstCallArgs = queryMock.mock.calls[0];
      expect(firstCallArgs?.[1]).toEqual([100, 0]);
    });
  });

  describe('EditorialService.listPages', () => {
    it('uses an explicit minimal projection in SQL and never selects p.*', async () => {
      let capturedListSql = '';
      const queryMock = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve([{ total: '1' }]);
        }
        capturedListSql = sql;
        return Promise.resolve([
          {
            id: 'page-1',
            page_type: 'about',
            status: 'published',
            effective_at: new Date('2026-01-01T00:00:00Z'),
            published_at: new Date('2026-01-01T00:00:00Z'),
            updated_at: new Date('2026-01-02T00:00:00Z'),
            title: 'About Geo-Kurdistan',
          },
        ]);
      });

      const dataSource = { query: queryMock } as unknown as DataSource;
      const service = new EditorialService(dataSource);

      const result = await service.listPages(20, 0);

      expect(capturedListSql).not.toMatch(/SELECT\s+p\.\*/i);
      expect(capturedListSql).not.toMatch(/SELECT\s+\*/i);

      expect(capturedListSql).toContain('p.id');
      expect(capturedListSql).toContain('p.page_type');
      expect(capturedListSql).toContain('p.status');
      expect(capturedListSql).toContain('p.effective_at');
      expect(capturedListSql).toContain('p.published_at');
      expect(capturedListSql).toContain('p.updated_at');
      expect(capturedListSql).toContain('t.title');

      expect(result.items).toHaveLength(1);
    });

    it('returns items containing exactly id, pageType, title, status, effectiveAt, publishedAt, updatedAt', async () => {
      const queryMock = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve([{ total: '2' }]);
        }
        return Promise.resolve([
          {
            id: 'page-about',
            page_type: 'about',
            status: 'published',
            effective_at: new Date('2026-01-01T00:00:00.000Z'),
            published_at: new Date('2026-01-02T00:00:00.000Z'),
            updated_at: new Date('2026-01-03T00:00:00.000Z'),
            title: 'About Us',
          },
          {
            id: 'page-terms',
            page_type: 'terms',
            status: 'draft',
            effective_at: null,
            published_at: null,
            updated_at: new Date('2026-01-04T00:00:00.000Z'),
            title: null,
          },
        ]);
      });

      const dataSource = { query: queryMock } as unknown as DataSource;
      const service = new EditorialService(dataSource);

      const result = await service.listPages(10, 0);
      expect(result.items).toHaveLength(2);

      const [firstItem, secondItem] = result.items;
      expect(firstItem).toBeDefined();
      expect(secondItem).toBeDefined();
      if (!firstItem || !secondItem) throw new Error('Expected items');

      expect(Object.keys(firstItem).sort()).toEqual(
        ['effectiveAt', 'id', 'pageType', 'publishedAt', 'status', 'title', 'updatedAt'].sort(),
      );
      expect(firstItem).toEqual({
        id: 'page-about',
        pageType: 'about',
        title: 'About Us',
        status: 'published',
        effectiveAt: '2026-01-01T00:00:00.000Z',
        publishedAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-03T00:00:00.000Z',
      });

      expect(Object.keys(secondItem).sort()).toEqual(
        ['effectiveAt', 'id', 'pageType', 'publishedAt', 'status', 'title', 'updatedAt'].sort(),
      );
      expect(secondItem).toEqual({
        id: 'page-terms',
        pageType: 'terms',
        title: null,
        status: 'draft',
        effectiveAt: null,
        publishedAt: null,
        updatedAt: '2026-01-04T00:00:00.000Z',
      });
    });

    it('ensures sensitive, internal, and unnecessary fields are absent from page items', async () => {
      const queryMock = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve([{ total: '1' }]);
        }
        return Promise.resolve([
          {
            id: 'page-clean',
            page_type: 'privacy',
            status: 'draft',
            effective_at: null,
            published_at: null,
            updated_at: new Date('2026-01-01T00:00:00Z'),
            title: 'Privacy Policy',
          },
        ]);
      });

      const dataSource = { query: queryMock } as unknown as DataSource;
      const service = new EditorialService(dataSource);

      const result = await service.listPages(20, 0);
      const [item] = result.items;
      expect(item).toBeDefined();
      if (!item) throw new Error('Expected item');

      expect(item).not.toHaveProperty('reviewed_by_user_id');
      expect(item).not.toHaveProperty('reviewedByUserId');
      expect(item).not.toHaveProperty('created_at');
      expect(item).not.toHaveProperty('createdAt');
      expect(item).not.toHaveProperty('body');
      expect(item).not.toHaveProperty('translations');
    });

    it('filters pages by status using parameterized queries for both data and count', async () => {
      const capturedCalls: Array<{ sql: string; params: unknown[] }> = [];
      const queryMock = vi.fn().mockImplementation((sql: string, params: unknown[]) => {
        capturedCalls.push({ sql, params });
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve([{ total: '1' }]);
        }
        return Promise.resolve([]);
      });

      const dataSource = { query: queryMock } as unknown as DataSource;
      const service = new EditorialService(dataSource);

      const result = await service.listPages(15, 0, 'published');

      expect(capturedCalls).toHaveLength(2);

      const [listCall, countCall] = capturedCalls;
      expect(listCall).toBeDefined();
      expect(countCall).toBeDefined();
      if (!listCall || !countCall) throw new Error('Expected captured calls');

      expect(listCall.sql).toContain('WHERE p.status = $3');
      expect(listCall.sql).not.toContain("'published'");
      expect(listCall.params).toEqual([15, 0, 'published']);

      expect(countCall.sql).toContain('WHERE p.status = $1');
      expect(countCall.sql).not.toContain("'published'");
      expect(countCall.params).toEqual(['published']);

      expect(result.total).toBe(1);
      expect(result.limit).toBe(15);
      expect(result.offset).toBe(0);
    });

    it('returns valid empty state when database contains zero managed pages', async () => {
      const queryMock = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve([{ total: '0' }]);
        }
        return Promise.resolve([]);
      });

      const dataSource = { query: queryMock } as unknown as DataSource;
      const service = new EditorialService(dataSource);

      const result = await service.listPages(20, 0);

      expect(result).toEqual({
        items: [],
        total: 0,
        limit: 20,
        offset: 0,
      });
    });

    it('clamps limit to 1..100 and clamps negative offset to 0 for pages', async () => {
      const queryMock = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve([{ total: '0' }]);
        }
        return Promise.resolve([]);
      });

      const dataSource = { query: queryMock } as unknown as DataSource;
      const service = new EditorialService(dataSource);

      const result = await service.listPages(500, -5);

      expect(result.limit).toBe(100);
      expect(result.offset).toBe(0);

      const firstCallArgs = queryMock.mock.calls[0];
      expect(firstCallArgs?.[1]).toEqual([100, 0]);
    });
  });
});
