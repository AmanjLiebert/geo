import { join } from 'node:path';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { Environment } from '../config/environment';

type DatabaseEnvironment = Pick<
  Environment,
  | 'APP_NAME'
  | 'DATABASE_URL'
  | 'DATABASE_SSL'
  | 'DATABASE_POOL_SIZE'
  | 'DATABASE_CONNECT_TIMEOUT_MS'
>;

export function createDataSourceOptions(environment: DatabaseEnvironment): DataSourceOptions {
  return {
    type: 'postgres',
    url: environment.DATABASE_URL,
    applicationName: environment.APP_NAME,
    ssl: environment.DATABASE_SSL ? { rejectUnauthorized: true } : false,
    poolSize: environment.DATABASE_POOL_SIZE,
    connectTimeoutMS: environment.DATABASE_CONNECT_TIMEOUT_MS,
    synchronize: false,
    migrationsRun: false,
    migrationsTableName: 'schema_migrations',
    migrationsTransactionMode: 'all',
    // Only timestamp-prefixed migration files; never import colocated Vitest specs.
    migrations: [join(__dirname, 'migrations', '[0-9]*-*.{js,ts}')],
    entities: [join(__dirname, '..', '**', '*.entity.{js,ts}')],
  };
}

export function createNestDatabaseOptions(environment: DatabaseEnvironment): TypeOrmModuleOptions {
  return {
    ...createDataSourceOptions(environment),
    autoLoadEntities: true,
    retryAttempts: 5,
    retryDelay: 1_000,
  };
}
