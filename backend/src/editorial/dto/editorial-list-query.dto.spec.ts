import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import {
  EditorialListQueryDto,
  MAX_EDITORIAL_LIMIT,
  MAX_EDITORIAL_OFFSET,
} from './editorial-list-query.dto';

describe('editorial list query DTO validation', () => {
  describe('status validation', () => {
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
  });

  describe('limit boundary validation', () => {
    it('accepts omitted limit and valid integer strings within [1, 100]', async () => {
      for (const val of [undefined, '1', '20', '50', '100', 1, 20, 100]) {
        const dto = plainToInstance(EditorialListQueryDto, { limit: val });
        const errors = await validate(dto);
        expect(errors.filter((e) => e.property === 'limit')).toHaveLength(0);
      }
    });

    it('rejects malformed limit strings (e.g. 20abc, 1.5)', async () => {
      for (const val of ['20abc', 'abc', '1.5', '2.0', '1e2']) {
        const dto = plainToInstance(EditorialListQueryDto, { limit: val });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'limit')).toBe(true);
      }
    });

    it('rejects arrays for limit', async () => {
      const dto = plainToInstance(EditorialListQueryDto, { limit: ['20', '30'] });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'limit')).toBe(true);
    });

    it('rejects limit < 1', async () => {
      for (const val of ['0', '-1', '-100', 0, -1]) {
        const dto = plainToInstance(EditorialListQueryDto, { limit: val });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'limit')).toBe(true);
      }
    });

    it(`rejects limit > ${MAX_EDITORIAL_LIMIT}`, async () => {
      for (const val of ['101', '500', 101]) {
        const dto = plainToInstance(EditorialListQueryDto, { limit: val });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'limit')).toBe(true);
      }
    });
  });

  describe('offset boundary validation', () => {
    it('accepts omitted offset and valid integer strings within [0, 100000]', async () => {
      for (const val of [undefined, '0', '20', '1000', String(MAX_EDITORIAL_OFFSET), 0, 100]) {
        const dto = plainToInstance(EditorialListQueryDto, { offset: val });
        const errors = await validate(dto);
        expect(errors.filter((e) => e.property === 'offset')).toHaveLength(0);
      }
    });

    it('rejects malformed offset strings (e.g. 20abc, 1.5)', async () => {
      for (const val of ['20abc', 'abc', '1.5', '0.5']) {
        const dto = plainToInstance(EditorialListQueryDto, { offset: val });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'offset')).toBe(true);
      }
    });

    it('rejects arrays for offset', async () => {
      const dto = plainToInstance(EditorialListQueryDto, { offset: ['0', '10'] });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'offset')).toBe(true);
    });

    it('rejects offset < 0', async () => {
      for (const val of ['-1', '-50', -1]) {
        const dto = plainToInstance(EditorialListQueryDto, { offset: val });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'offset')).toBe(true);
      }
    });

    it(`rejects excessively large offsets > ${MAX_EDITORIAL_OFFSET}`, async () => {
      for (const val of ['100001', '1000000', '999999999999999999999999999']) {
        const dto = plainToInstance(EditorialListQueryDto, { offset: val });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'offset')).toBe(true);
      }
    });
  });
});
