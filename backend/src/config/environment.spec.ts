import { describe, expect, it } from 'vitest';
import { parseCorsOrigins, validateEnvironment } from './environment';

describe('environment validation', () => {
  it('applies safe defaults and converts numeric values', () => {
    const environment = validateEnvironment({
      DATABASE_URL: 'postgresql://user:password@localhost:5432/geo_kurdistan',
      PORT: '4100',
      DATABASE_SSL: 'true',
    });

    expect(environment.PORT).toBe(4100);
    expect(environment.DATABASE_SSL).toBe(true);
    expect(environment.DATABASE_POOL_SIZE).toBe(10);
    expect(environment.MEDIA_MAX_VIDEO_BYTES).toBe(52_428_800);
    expect(environment.MEDIA_MAX_VIDEO_DURATION_SECONDS).toBe(300);
  });

  it('rejects a missing database URL', () => {
    expect(() => validateEnvironment({})).toThrow('DATABASE_URL');
  });

  it('keeps API documentation disabled by default in production', () => {
    const environment = validateEnvironment({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:password@localhost:5432/geo_kurdistan',
      AUTH_FIREBASE_PROJECT_ID: 'geo-kurdistan-production',
    });

    expect(environment.SWAGGER_ENABLED).toBe(false);
  });

  it('requires an explicit Firebase project in production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:password@localhost:5432/geo_kurdistan',
      }),
    ).toThrow('AUTH_FIREBASE_PROJECT_ID');
  });

  it('rejects unsafe queue schema names', () => {
    expect(() =>
      validateEnvironment({
        DATABASE_URL: 'postgresql://user:password@localhost:5432/geo_kurdistan',
        QUEUE_SCHEMA: 'pgboss; DROP SCHEMA public',
      }),
    ).toThrow('QUEUE_SCHEMA');
  });

  it('normalizes and deduplicates CORS origins', () => {
    expect(parseCorsOrigins('https://one.test, https://two.test,https://one.test')).toEqual([
      'https://one.test',
      'https://two.test',
    ]);
  });
});
