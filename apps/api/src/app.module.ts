import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard, RolesGuard } from './auth/auth.guards';
import { CalificacionApiModule } from './calificacion/calificacion.module';
import { CapacitacionesModule } from './capacitaciones/capacitaciones.module';
import { ConfigModule } from './config/config.module';
import { FeedbackModule } from './feedback/feedback.module';
import { HealthController } from './health/health.controller';
import { InscripcionesModule } from './inscripciones/inscripciones.module';
import { ModulosModule } from './modulos/modulos.module';
import { PrismaModule } from './prisma/prisma.service';
import { ProgresoModule } from './progreso/progreso.module';
import { RespuestasModule } from './respuestas/respuestas.module';
import { ResultadosModule } from './resultados/resultados.module';
import { StorageModule } from './storage/storage.module';

/** Proceso HTTP: controladores + productor de la cola. El procesador vive en WorkerModule. */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    StorageModule,
    AuthModule,
    // Límite general; /auth/login lleva uno más estricto con @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 600 }]),
    CapacitacionesModule,
    ModulosModule,
    InscripcionesModule,
    ProgresoModule,
    RespuestasModule,
    CalificacionApiModule,
    ResultadosModule,
    FeedbackModule,
  ],
  controllers: [HealthController],
  providers: [
    // Orden: límite de peticiones → autenticación (JWT) → autorización por rol (@Roles)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
