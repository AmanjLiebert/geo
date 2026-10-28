import Joi from 'joi';

export type NodeEnvironment = 'development' | 'test' | 'production';
export type DeploymentProfile = 'production' | 'demo';

export interface Environment {
  NODE_ENV: NodeEnvironment;
  DEPLOYMENT_PROFILE: DeploymentProfile;
  APP_NAME: string;
  HOST: string;
  PORT: number;
  LOG_LEVEL: string;
  DATABASE_URL: string;
  DATABASE_SSL: boolean;
  DATABASE_POOL_SIZE: number;
  DATABASE_CONNECT_TIMEOUT_MS: number;
  TRUST_PROXY: boolean;
  CORS_ORIGINS: string;
  REQUEST_BODY_LIMIT_BYTES: number;
  RATE_LIMIT_MAX: number;
  RATE_LIMIT_WINDOW_MS: number;
  SWAGGER_ENABLED: boolean;
  HEALTH_DB_TIMEOUT_MS: number;
  QUEUE_SCHEMA: string;
  QUEUE_CONCURRENCY: number;
  JOB_PROOF_TIMEOUT_MS: number;
  AUTH_FIREBASE_PROJECT_ID: string;
  AUTH_FIREBASE_SERVICE_ACCOUNT_PATH: string;
  AUTH_SESSION_COOKIE_NAME: string;
  AUTH_CSRF_COOKIE_NAME: string;
  AUTH_PREAUTH_CSRF_COOKIE_NAME: string;
  AUTH_SESSION_TTL_SECONDS: number;
  AUTH_REAUTH_MAX_AGE_SECONDS: number;
  AUTH_INVITATION_TTL_HOURS: number;
  AUTH_COOKIE_SECURE: boolean;
  AUTH_COOKIE_DOMAIN: string;
  AUTH_PRIVILEGED_MFA_REQUIRED: boolean;
  MEDIA_STORAGE_ENDPOINT: string;
  MEDIA_STORAGE_REGION: string;
  MEDIA_STORAGE_BUCKET: string;
  MEDIA_STORAGE_KEY_ID: string;
  MEDIA_STORAGE_APPLICATION_KEY: string;
  MEDIA_SCANNER_HOST: string;
  MEDIA_SCANNER_PORT: number;
  MEDIA_SCANNER_TIMEOUT_MS: number;
  MEDIA_MAX_PDF_PAGES: number;
  MEDIA_MAX_VIDEO_BYTES: number;
  MEDIA_MAX_VIDEO_DURATION_SECONDS: number;
  MEDIA_DEMO_IMAGE_PROCESSING_ENABLED: boolean;
  MEDIA_DEMO_STORAGE_PREFIX: string;
  MEDIA_DEMO_MAX_IMAGE_BYTES: number;
  MEDIA_DEMO_MAX_IMAGE_PIXELS: number;
}

export const environmentSchema = Joi.object<Environment>({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  DEPLOYMENT_PROFILE: Joi.string().valid('production', 'demo').default('production'),
  APP_NAME: Joi.string().trim().min(1).max(100).default('geo-kurdistan-api'),
  HOST: Joi.string().hostname().default('0.0.0.0'),
  PORT: Joi.number().port().default(4000),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .default('info'),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  DATABASE_SSL: Joi.boolean().truthy('true').falsy('false').default(false),
  DATABASE_POOL_SIZE: Joi.number().integer().min(1).max(50).default(10),
  DATABASE_CONNECT_TIMEOUT_MS: Joi.number().integer().min(500).max(60_000).default(5_000),
  TRUST_PROXY: Joi.boolean().truthy('true').falsy('false').default(false),
  CORS_ORIGINS: Joi.string().default('http://localhost:3000,http://localhost:8080'),
  REQUEST_BODY_LIMIT_BYTES: Joi.number().integer().min(16_384).max(10_485_760).default(1_048_576),
  RATE_LIMIT_MAX: Joi.number().integer().min(1).max(10_000).default(120),
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(1_000).max(3_600_000).default(60_000),
  SWAGGER_ENABLED: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.boolean().default(false),
      otherwise: Joi.boolean().default(true),
    }),
  HEALTH_DB_TIMEOUT_MS: Joi.number().integer().min(100).max(30_000).default(2_000),
  QUEUE_SCHEMA: Joi.string()
    .pattern(/^[a-z][a-z0-9_]{0,62}$/)
    .default('pgboss'),
  QUEUE_CONCURRENCY: Joi.number().integer().min(1).max(32).default(2),
  JOB_PROOF_TIMEOUT_MS: Joi.number().integer().min(1_000).max(120_000).default(15_000),
  AUTH_FIREBASE_PROJECT_ID: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.string().default('demo-geo-kurdistan'),
    }),
  AUTH_FIREBASE_SERVICE_ACCOUNT_PATH: Joi.string().trim().allow('').default(''),
  AUTH_SESSION_COOKIE_NAME: Joi.string()
    .pattern(/^[A-Za-z0-9_-]{1,64}$/)
    .default('gk_session'),
  AUTH_CSRF_COOKIE_NAME: Joi.string()
    .pattern(/^[A-Za-z0-9_-]{1,64}$/)
    .default('gk_csrf'),
  AUTH_PREAUTH_CSRF_COOKIE_NAME: Joi.string()
    .pattern(/^[A-Za-z0-9_-]{1,64}$/)
    .default('gk_preauth_csrf'),
  AUTH_SESSION_TTL_SECONDS: Joi.number().integer().min(900).max(1_209_600).default(86_400),
  AUTH_REAUTH_MAX_AGE_SECONDS: Joi.number().integer().min(60).max(3_600).default(300),
  AUTH_INVITATION_TTL_HOURS: Joi.number().integer().min(1).max(720).default(72),
  AUTH_COOKIE_SECURE: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.boolean().default(true),
      otherwise: Joi.boolean().default(false),
    }),
  AUTH_COOKIE_DOMAIN: Joi.string().trim().allow('').default(''),
  AUTH_PRIVILEGED_MFA_REQUIRED: Joi.boolean().truthy('true').falsy('false').default(false),
  MEDIA_STORAGE_ENDPOINT: Joi.string()
    .uri({ scheme: ['https'] })
    .allow('')
    .default(''),
  MEDIA_STORAGE_REGION: Joi.string().trim().max(80).default('us-west-004'),
  MEDIA_STORAGE_BUCKET: Joi.string().trim().max(255).allow('').default(''),
  MEDIA_STORAGE_KEY_ID: Joi.string().trim().allow('').default(''),
  MEDIA_STORAGE_APPLICATION_KEY: Joi.string().trim().allow('').default(''),
  MEDIA_SCANNER_HOST: Joi.string().hostname().default('clamav'),
  MEDIA_SCANNER_PORT: Joi.number().port().default(3310),
  MEDIA_SCANNER_TIMEOUT_MS: Joi.number().integer().min(1_000).max(300_000).default(120_000),
  MEDIA_MAX_PDF_PAGES: Joi.number().integer().min(1).max(250).default(100),
  MEDIA_MAX_VIDEO_BYTES: Joi.number().integer().min(1_048_576).max(104_857_600).default(52_428_800),
  MEDIA_MAX_VIDEO_DURATION_SECONDS: Joi.number().integer().min(1).max(1_800).default(300),
  MEDIA_DEMO_IMAGE_PROCESSING_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
  MEDIA_DEMO_STORAGE_PREFIX: Joi.string()
    .pattern(/^[a-z0-9][a-z0-9-]{0,62}$/)
    .default('demo'),
  MEDIA_DEMO_MAX_IMAGE_BYTES: Joi.number().integer().min(262_144).max(3_145_728).default(3_145_728),
  MEDIA_DEMO_MAX_IMAGE_PIXELS: Joi.number()
    .integer()
    .min(1_000_000)
    .max(16_000_000)
    .default(12_000_000),
}).unknown(true);

export function validateEnvironment(input: NodeJS.ProcessEnv): Environment {
  const result = environmentSchema.validate(input, {
    abortEarly: false,
    allowUnknown: true,
    convert: true,
    stripUnknown: false,
  });

  if (result.error) {
    throw new Error(`Invalid environment configuration: ${result.error.message}`);
  }

  const environment = result.value;
  if (
    environment.MEDIA_DEMO_IMAGE_PROCESSING_ENABLED &&
    environment.DEPLOYMENT_PROFILE !== 'demo'
  ) {
    throw new Error(
      'Invalid environment configuration: MEDIA_DEMO_IMAGE_PROCESSING_ENABLED requires DEPLOYMENT_PROFILE=demo.',
    );
  }

  if (environment.MEDIA_DEMO_IMAGE_PROCESSING_ENABLED) {
    const databaseName = new URL(environment.DATABASE_URL).pathname.toLowerCase();
    if (!databaseName.includes('demo')) {
      throw new Error(
        'Invalid environment configuration: demo image processing requires a database name containing "demo".',
      );
    }
  }

  return environment;
}

export function parseCorsOrigins(value: string): string[] {
  return [
    ...new Set(
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  ];
}
