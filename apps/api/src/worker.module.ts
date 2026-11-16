import { Module } from '@nestjs/common';
import { CalificacionWorkerModule } from './calificacion/calificacion.module';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.service';

/** Proceso `worker`: sin HTTP. Consume la cola BullMQ y califica con el IAProvider. */
@Module({ imports: [ConfigModule, PrismaModule, CalificacionWorkerModule] })
export class WorkerModule {}
