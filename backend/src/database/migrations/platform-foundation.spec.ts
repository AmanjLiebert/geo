import { QueryRunner } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { PlatformFoundation1758780000000 } from './1758780000000-platform-foundation';

describe('platform foundation migration', () => {
  it('enables PostGIS and creates only configuration storage', async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    const runner = { query } as unknown as QueryRunner;
    const migration = new PlatformFoundation1758780000000();

    await migration.up(runner);

    expect(query).toHaveBeenCalledTimes(2);
    expect(String(query.mock.calls[0]?.[0])).toContain('CREATE EXTENSION IF NOT EXISTS postgis');
    expect(String(query.mock.calls[1]?.[0])).toContain('platform_settings');
    expect(String(query.mock.calls[1]?.[0])).toContain('jsonb');
  });
});
