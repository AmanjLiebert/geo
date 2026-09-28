import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { Environment, validateEnvironment } from './config/environment';
import { createLoggingConfig } from './config/logging.config';
import { createNestDatabaseOptions } from './database/database.config';
import { HealthModule } from './health/health.module';
import { IdentityModule } from './identity/identity.module';
import { MetricsController } from './platform/metrics.controller';
import { MetricsInterceptor } from './platform/metrics.interceptor';
import { MetricsService } from './platform/metrics.service';
import { ProblemDetailsFilter } from './platform/problem-details.filter';
import { ScientificContentModule } from './scientific-content/scientific-content.module';
import { EditorialModule } from './editorial/editorial.module';
import { MediaModule } from './media/media.module';
import { PublishingModule } from './publishing/publishing.module';
import { ResearchModule } from './research/research.module';

@Module({
  imports: [
    ConfigModule.forRoot({
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
    HealthModule,
    IdentityModule,
    PublishingModule,
    ScientificContentModule,
    MediaModule,
    ResearchModule,
    EditorialModule,
  ],
  controllers: [AppController, MetricsController],
  providers: [
    MetricsService,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
  ],
})
export class AppModule {}
