import 'reflect-metadata';
import './config/load-root-environment';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { WorkerModule } from './worker.module';

async function bootstrapWorker(): Promise<void> {
  const worker = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });
  worker.useLogger(worker.get(Logger));
  worker.enableShutdownHooks();
}

void bootstrapWorker();
