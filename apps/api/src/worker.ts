import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { cargarEnv } from './config/env';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const env = cargarEnv();
  const app = await NestFactory.createApplicationContext(WorkerModule, { logger: ['log', 'warn', 'error'] });
  app.enableShutdownHooks();
  new Logger('Worker').log(`Worker de calificación listo · IA: ${env.ia.provider}${env.ia.mockFallar ? ' (fallas simuladas)' : ''}`);
}

void bootstrap();
