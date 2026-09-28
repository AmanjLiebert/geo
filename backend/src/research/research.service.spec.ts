import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it, vi } from 'vitest';
import { DataSource } from 'typeorm';
import { Permission } from '../identity/access-control';
import { REQUIRED_PERMISSIONS_KEY } from '../identity/access.decorators';
import { ResearchController } from './research.controller';
import { ResearchListQueryDto } from './dto/research-list-query.dto';
import { ResearchService } from './research.service';

describe('research list query and service', () => {
  describe('ResearchListQueryDto validation', () => {
    it('accepts valid research statuses', async () => {
      const validStatuses = ['draft', 'in_review', 'published', 'archived'];
      for (const status of validStatuses) {
        const dto = plainToInstance(ResearchListQueryDto, { status });
        const errors = await validate(dto);
        expect(errors.filter((e) => e.property === 'status')).toHaveLength(0);
      }
    });

    it('rejects invalid research statuses', async () => {
      const invalidStatuses = ['unclassified_draft', 'pending', 'deleted', 'unknown'];
      for (const status of invalidStatuses) {
        const dto = plainToInstance(ResearchListQueryDto, { status });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'status')).toBe(true);
      }
    });

    it('accepts query without status', async () => {
      const dto = plainToInstance(ResearchListQueryDto, { limit: '25', offset: '10' });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('ResearchController policy', () => {
    it('protects research routes with MANAGE_RESEARCH permission', () => {
      expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ResearchController)).toEqual([
        Permission.MANAGE_RESEARCH,
      ]);
    });
  });

  describe('ResearchService.list', () => {
    it('bounds limit to 1..100 and clamps negative offset to 0', async () => {
      const queryMock = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve([{ total: '0' }]);
        }
        return Promise.resolve([]);
      });
      const dataSource = { query: queryMock } as unknown as DataSource;
      const service = new ResearchService(dataSource);

      // limit > 100 clamped to 100, offset < 0 clamped to 0
      const result = await service.list(200, -5);
      expect(result.limit).toBe(100);
      expect(result.offset).toBe(0);
      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);

      // verify parameters passed to query
      const firstCallArgs = queryMock.mock.calls[0];
      expect(firstCallArgs).toBeDefined();
      expect(firstCallArgs?.[1]).toEqual([100, 0]);
    });

    it('filters by status with parameterized SQL', async () => {
      const queryMock = vi.fn().mockImplementation((sql: string, params: unknown[]) => {
        if (sql.includes('COUNT(*)')) {
          expect(sql).toContain('WHERE p.status = $1');
          expect(params).toEqual(['published']);
          return Promise.resolve([{ total: '1' }]);
        }
        expect(sql).toContain('WHERE p.status = $3');
        expect(params).toEqual([25, 0, 'published']);
        return Promise.resolve([
          {
            id: 'uuid-1',
            stable_id: 'stable-1',
            slug: 'test-slug',
            status: 'published',
            publication_year: 2024,
            doi: '10.1234/test',
            rights_statement: 'CC-BY-4.0',
            owner_user_id: 'user-1',
            published_at: new Date('2024-06-01T00:00:00Z'),
            created_at: new Date('2024-01-01T00:00:00Z'),
            updated_at: new Date('2024-06-02T00:00:00Z'),
            title: 'Sample Publication',
          },
        ]);
      });
      const dataSource = { query: queryMock } as unknown as DataSource;
      const service = new ResearchService(dataSource);

      const result = await service.list(25, 0, 'published');
      expect(result.total).toBe(1);
      expect(result.limit).toBe(25);
      expect(result.offset).toBe(0);
      expect(result.items).toHaveLength(1);

      // verify camelCase representation
      const item = result.items[0];
      expect(item).toEqual({
        id: 'uuid-1',
        stableId: 'stable-1',
        slug: 'test-slug',
        status: 'published',
        publicationYear: 2024,
        doi: '10.1234/test',
        rightsStatement: 'CC-BY-4.0',
        ownerUserId: 'user-1',
        publishedAt: '2024-06-01T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-06-02T00:00:00.000Z',
        title: 'Sample Publication',
      });
    });

    it('returns valid empty state when database contains zero publications', async () => {
      const queryMock = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve([{ total: '0' }]);
        }
        return Promise.resolve([]);
      });
      const dataSource = { query: queryMock } as unknown as DataSource;
      const service = new ResearchService(dataSource);

      const result = await service.list(50, 0);
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });
  });
});
