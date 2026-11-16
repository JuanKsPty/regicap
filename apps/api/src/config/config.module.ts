import { Global, Module } from '@nestjs/common';
import { ENV, cargarEnv } from './env';

/** Configuración tipada disponible para toda la app (API y worker). */
@Global()
@Module({
  providers: [{ provide: ENV, useFactory: cargarEnv }],
  exports: [ENV],
})
export class ConfigModule {}
