import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadEnvironmentFile, resolveRootPath } from './environment-file';

const directories: string[] = [];
function fixtureDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'gk-env-'));
  directories.push(directory);
  return directory;
}
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true });
});

describe('root environment loading', () => {
  it('resolves root-relative Firebase paths and preserves absolute paths', () => {
    expect(resolveRootPath('secrets/firebase.json')).toBe(
      resolve(__dirname, '../../../secrets/firebase.json'),
    );
    const absolute = join(fixtureDirectory(), 'firebase.json');
    expect(resolveRootPath(absolute)).toBe(absolute);
  });
  it('loads quoted values while preserving injected deployment values', () => {
    const file = join(fixtureDirectory(), '.env');
    writeFileSync(file, 'DATABASE_URL="postgresql://example.invalid/test"\nNODE_ENV=development\n');
    const target: NodeJS.ProcessEnv = { NODE_ENV: 'production' };
    loadEnvironmentFile(file, target);
    expect(target.DATABASE_URL).toBe('postgresql://example.invalid/test');
    expect(target.NODE_ENV).toBe('production');
  });
  it('supports containers configured entirely through injected variables', () => {
    const target = { DATABASE_URL: 'postgresql://example.invalid/injected' };
    loadEnvironmentFile(join(fixtureDirectory(), 'missing.env'), target);
    expect(target.DATABASE_URL).toBe('postgresql://example.invalid/injected');
  });
  it('reports unreadable files without exposing their path or contents', () => {
    expect(() => loadEnvironmentFile(fixtureDirectory(), {})).toThrow(
      'Unable to read the root environment file. Check file permissions.',
    );
  });
});
