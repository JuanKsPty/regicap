import { Module } from '@nestjs/common';
import { ProgresoModule } from '../progreso/progreso.module';
import { InscripcionesController } from './inscripciones.controller';
import { InscripcionesRepository } from './inscripciones.repository';
import { InscripcionesService } from './inscripciones.service';

@Module({
  imports: [ProgresoModule],
  controllers: [InscripcionesController],
  providers: [InscripcionesService, InscripcionesRepository],
  exports: [InscripcionesService],
})
export class InscripcionesModule {}
