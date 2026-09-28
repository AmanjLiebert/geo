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
});
