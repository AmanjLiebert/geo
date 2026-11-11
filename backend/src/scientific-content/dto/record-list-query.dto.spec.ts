import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { RecordListQueryDto } from './record-list-query.dto';

describe('record list query DTO validation', () => {
  it('accepts all legitimate record statuses including published', async () => {
    const validStatuses = ['unclassified_draft', 'draft', 'in_review', 'published', 'archived'];
    for (const status of validStatuses) {
      const dto = plainToInstance(RecordListQueryDto, { status });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'status')).toHaveLength(0);
    }
  });

  it('rejects illegitimate status values', async () => {
    const invalidStatuses = ['deleted', 'pending', 'unknown', 'draft_published'];
    for (const status of invalidStatuses) {
      const dto = plainToInstance(RecordListQueryDto, { status });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'status')).toBe(true);
    }
  });

  it('accepts query without status', async () => {
    const dto = plainToInstance(RecordListQueryDto, { limit: '20', offset: '0' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('trims and accepts a bounded title or category query', async () => {
    const dto = plainToInstance(RecordListQueryDto, { query: '  limestone  ' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.query).toBe('limestone');
  });

  it.each(['a', '', 'x'.repeat(121), 42, ['rock'], { title: 'rock' }])(
    'rejects an invalid search query: %j',
    async (query) => {
      const dto = plainToInstance(RecordListQueryDto, { query });
      const errors = await validate(dto);
      expect(errors.some((error) => error.property === 'query')).toBe(true);
    },
  );

  it('accepts a trimmed, lowercase category slug', async () => {
    const dto = plainToInstance(RecordListQueryDto, { category: '  invertebrate-fossils  ' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.category).toBe('invertebrate-fossils');
  });

  it.each([
    'Fossils',
    'invertebrate fossils',
    'fossils/../../records',
    '-fossils',
    'fossils-',
    'fossils--rocks',
    'fossils_rocks',
    'fossils?status=archived',
    'x'.repeat(121),
    42,
    ['fossils'],
    { slug: 'fossils' },
  ])('rejects an invalid category slug: %j', async (category) => {
    const dto = plainToInstance(RecordListQueryDto, { category });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'category')).toBe(true);
  });
});
