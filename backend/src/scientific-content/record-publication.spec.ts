import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { ScientificTrustService } from '../publishing/scientific-trust.service';
import { RecordsService } from './records.service';

function createHarness(initialStatus: 'draft' | 'in_review' | 'published', owner = 'author-1') {
  const record = {
    id: 'record-1',
    stable_id: 'stable-1',
    slug: 'sample-record',
    status: initialStatus,
    category_id: 'category-1',
    record_type_id: 'type-1',
    template_version_id: 'template-1',
    attributes: {},
    owner_user_id: owner,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
  };
  const translation = {
    locale: 'en',
    title: 'Sample outcrop',
    summary: 'A documented geological exposure.',
    description: 'Field observations and evidence for the geological exposure.',
    source_locale: null,
    status: initialStatus === 'published' ? 'published' : 'draft',
    translator_user_id: owner,
    reviewer_user_id: null as string | null,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
  };
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const query = vi.fn((sql: string, params: unknown[] = []): Promise<unknown[]> => {
    calls.push({ sql, params });
    if (sql.includes('SELECT * FROM scientific_records')) return Promise.resolve([record]);
    if (sql.includes('SELECT * FROM record_translations')) return Promise.resolve([translation]);
    if (sql.includes('SELECT stable_key, data_type')) return Promise.resolve([]);
    if (sql.includes('SELECT c.id FROM categories')) return Promise.resolve([{ id: 'category-1' }]);
    if (sql.includes("SET status = 'in_review'")) record.status = 'in_review';
    if (sql.includes("SET status = 'published'")) record.status = 'published';
    if (sql.includes("SET status = 'draft'")) {
      if (sql.includes('record_translations')) translation.status = 'draft';
      if (sql.includes('scientific_records')) record.status = 'draft';
    }
    if (sql.includes("record_translations SET status = 'published'")) {
      translation.status = 'published';
      translation.reviewer_user_id = String(params[1]);
    }
    return Promise.resolve([]);
  });
  const manager = { query };
  const dataSource = {
    query,
    transaction: (work: (value: { query: typeof query }) => Promise<unknown>) => work(manager),
  } as unknown as DataSource;
  const publicationIssues = vi.fn().mockResolvedValue({ valid: true, issues: [] });
  const trust = {
    publicationIssues,
  } as unknown as ScientificTrustService;
  return {
    service: new RecordsService(dataSource, trust),
    publicationIssues,
    manager,
    calls,
    record,
    translation,
  };
}

describe('record review and publication lifecycle', () => {
  it('checks a complete draft under the lock before submitting it for review', async () => {
    const { service, publicationIssues, manager, calls, record } = createHarness('draft');
    await service.submitForReview('author-1', 'record-1');
    expect(record.status).toBe('in_review');
    expect(publicationIssues).toHaveBeenCalledWith('record-1', undefined, manager);
    expect(calls.some((call) => call.sql.includes('FOR UPDATE'))).toBe(true);
    expect(
      calls.some(
        (call) =>
          call.sql.includes('INSERT INTO content_audit_events') &&
          call.params[1] === 'scientific-record.submitted-for-review',
      ),
    ).toBe(true);
  });

  it('publishes an in-review record and approves English details atomically', async () => {
    const { service, publicationIssues, manager, calls, record, translation } =
      createHarness('in_review');
    await service.publish('reviewer-2', 'record-1');
    expect(record.status).toBe('published');
    expect(translation.status).toBe('published');
    expect(translation.reviewer_user_id).toBe('reviewer-2');
    expect(publicationIssues).toHaveBeenCalledWith('record-1', 'reviewer-2', manager);
    expect(
      calls.some(
        (call) =>
          call.sql.includes('INSERT INTO content_audit_events') &&
          call.params[1] === 'scientific-record.published',
      ),
    ).toBe(true);
  });

  it('prevents an author from returning their own record for changes', async () => {
    const { service } = createHarness('in_review');
    await expect(
      service.requestChanges('author-1', 'record-1', 'Needs detail'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns an independently reviewed record to draft without deleting its content', async () => {
    const { service, calls, record, translation } = createHarness('in_review');
    await service.requestChanges('reviewer-2', 'record-1', 'Add a clearer source citation.');
    expect(record.status).toBe('draft');
    expect(translation.status).toBe('draft');
    expect(calls.some((call) => call.sql.includes('DELETE FROM'))).toBe(false);
    const audit = calls.find(
      (call) =>
        call.sql.includes('INSERT INTO content_audit_events') &&
        call.params[1] === 'scientific-record.changes-requested',
    );
    expect(audit?.params[3]).toContain('Add a clearer source citation.');
  });

  it('unpublishes to an editable draft without deleting scientific work', async () => {
    const { service, calls, record, translation } = createHarness('published');
    await service.unpublish('admin-1', 'record-1');
    expect(record.status).toBe('draft');
    expect(translation.status).toBe('draft');
    expect(calls.some((call) => call.sql.includes('DELETE FROM'))).toBe(false);
    expect(
      calls.some(
        (call) =>
          call.sql.includes('INSERT INTO content_audit_events') &&
          call.params[1] === 'scientific-record.unpublished',
      ),
    ).toBe(true);
  });
});
