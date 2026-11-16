import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { cargarEnv } from './config/env';

async function bootstrap() {
  const env = cargarEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ['log', 'warn', 'error'] });

  app.set('trust proxy', 1); // detrás de Traefik: IP real para el límite de intentos
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new AllExceptionsFilter());
  // Web y API comparten dominio en producción (sin CORS). En desarrollo el front
  // usa un rewrite de Next, así que tampoco hace falta; se deja solo por si se llama directo.
  if (env.nodeEnv !== 'production') app.enableCors({ origin: env.webOrigin, credentials: true });
  app.enableShutdownHooks();

  await app.listen(env.apiPort, '0.0.0.0');
  new Logger('API').log(`REGICAP API escuchando en http://localhost:${env.apiPort}/api`);
}

void bootstrap();
