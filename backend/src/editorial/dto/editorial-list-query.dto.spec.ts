import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { EditorialListQueryDto } from './editorial-list-query.dto';

describe('editorial list query DTO validation', () => {
  it('accepts valid editorial statuses', async () => {
    const validStatuses = ['draft', 'in_review', 'published', 'archived'];
    for (const status of validStatuses) {
      const dto = plainToInstance(EditorialListQueryDto, { status });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'status')).toHaveLength(0);
    }
  });

  it('rejects invalid status values', async () => {
    const invalidStatuses = ['unclassified_draft', 'deleted', 'pending', 'unknown'];
    for (const status of invalidStatuses) {
      const dto = plainToInstance(EditorialListQueryDto, { status });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'status')).toBe(true);
    }
  });

  it('accepts query without status', async () => {
    const dto = plainToInstance(EditorialListQueryDto, { limit: '20', offset: '0' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
