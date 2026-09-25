import 'reflect-metadata';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { RequestMethod, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { parseCorsOrigins, validateEnvironment } from './config/environment';

async function bootstrap(): Promise<void> {
  const environment = validateEnvironment(process.env);
  const adapter = new FastifyAdapter({
    bodyLimit: environment.REQUEST_BODY_LIMIT_BYTES,
    trustProxy: environment.TRUST_PROXY,
  });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'health/live', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
      { path: 'metrics', method: RequestMethod.GET },
    ],
  });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    }),
  );
  app.enableCors({
    origin: parseCorsOrigins(environment.CORS_ORIGINS),
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(cookie);

  await app.register(
    helmet,
    environment.SWAGGER_ENABLED
      ? {
          contentSecurityPolicy: false,
          crossOriginResourcePolicy: { policy: 'same-site' },
        }
      : {
          crossOriginResourcePolicy: { policy: 'same-site' },
        },
  );
  await app.register(rateLimit, {
    max: environment.RATE_LIMIT_MAX,
    timeWindow: environment.RATE_LIMIT_WINDOW_MS,
    keyGenerator: (request) => request.ip,
  });

  if (environment.SWAGGER_ENABLED) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Geo-Kurdistan API')
      .setDescription('Versioned API contract for the Geo-Kurdistan platform.')
      .setVersion('1.0')
      .addCookieAuth(environment.AUTH_SESSION_COOKIE_NAME)
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      jsonDocumentUrl: 'docs/openapi.json',
    });
  }

  await app.listen({ host: environment.HOST, port: environment.PORT });
}

void bootstrap();
