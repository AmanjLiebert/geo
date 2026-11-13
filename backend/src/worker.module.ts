import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Environment, validateEnvironment } from './config/environment';
import { createLoggingConfig } from './config/logging.config';
import { createNestDatabaseOptions } from './database/database.config';
import { JobsModule } from './jobs/jobs.module';
import { QueueService } from './jobs/queue.service';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: true,
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) => createLoggingConfig(config),
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => createNestDatabaseOptions(validateEnvironment(process.env)),
    }),
    JobsModule,
    MediaModule,
  ],
  providers: [QueueService],
})
export class WorkerModule {}
