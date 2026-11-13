import { describe, expect, it } from 'vitest';
import { createDataSourceOptions } from './database.config';
import { globSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

describe('database configuration', () => {
  it('uses PostgreSQL with bounded pooling and migration-only schema changes', () => {
    const options = createDataSourceOptions({
      APP_NAME: 'geo-kurdistan-test',
      DATABASE_URL: 'postgresql://user:password@localhost:5432/geo_kurdistan',
      DATABASE_SSL: false,
      DATABASE_POOL_SIZE: 7,
      DATABASE_CONNECT_TIMEOUT_MS: 3_000,
    });

    expect(options.type).toBe('postgres');
    expect(options.synchronize).toBe(false);
    expect(options.migrationsRun).toBe(false);
    expect(options.poolSize).toBe(7);
    expect(options.migrations).toHaveLength(1);
    const pattern = (options.migrations as string[])[0]!;
    const discovered = Array.from(globSync(pattern.replaceAll('\\', '/'))).map((file) =>
      basename(file),
    );
    const directory = join(__dirname, 'migrations');
    const expected = readdirSync(directory).filter((file) => /^\d+-.*\.ts$/.test(file));
    expect(expected.length).toBeGreaterThan(0);
    expect(readdirSync(directory).some((file) => file.endsWith('.spec.ts'))).toBe(true);
    expect(discovered.sort()).toEqual(expected.sort());
    expect(discovered.some((file) => /\.(spec|test)\./.test(file))).toBe(false);
  });
});
