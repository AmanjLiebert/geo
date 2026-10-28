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
    expect(environment.DEPLOYMENT_PROFILE).toBe('production');
    expect(environment.MEDIA_DEMO_IMAGE_PROCESSING_ENABLED).toBe(false);
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

  it('enables demo processing only for an explicit demo profile and demo database', () => {
    const environment = validateEnvironment({
      DATABASE_URL: 'postgresql://demo:password@localhost:5432/geo_kurdistan_demo',
      DEPLOYMENT_PROFILE: 'demo',
      MEDIA_DEMO_IMAGE_PROCESSING_ENABLED: 'true',
    });

    expect(environment.MEDIA_DEMO_IMAGE_PROCESSING_ENABLED).toBe(true);
    expect(environment.MEDIA_DEMO_MAX_IMAGE_BYTES).toBe(3_145_728);
    expect(environment.MEDIA_DEMO_MAX_IMAGE_PIXELS).toBe(12_000_000);
  });

  it('fails closed when demo processing is enabled outside an isolated demo profile', () => {
    expect(() =>
      validateEnvironment({
        DATABASE_URL: 'postgresql://user:password@localhost:5432/geo_kurdistan',
        MEDIA_DEMO_IMAGE_PROCESSING_ENABLED: 'true',
      }),
    ).toThrow('requires DEPLOYMENT_PROFILE=demo');

    expect(() =>
      validateEnvironment({
        DATABASE_URL: 'postgresql://user:password@localhost:5432/geo_kurdistan',
        DEPLOYMENT_PROFILE: 'demo',
        MEDIA_DEMO_IMAGE_PROCESSING_ENABLED: 'true',
      }),
    ).toThrow('database name containing "demo"');
  });
});
