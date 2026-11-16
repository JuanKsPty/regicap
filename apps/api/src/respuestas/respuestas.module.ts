import { Module } from '@nestjs/common';
import { CalificacionColaModule } from '../calificacion/calificacion.module';
import { ProgresoModule } from '../progreso/progreso.module';
import { RespuestasController } from './respuestas.controller';
import { RespuestasRepository } from './respuestas.repository';
import { RespuestasService } from './respuestas.service';

@Module({
  imports: [ProgresoModule, CalificacionColaModule],
  controllers: [RespuestasController],
  providers: [RespuestasService, RespuestasRepository],
})
export class RespuestasModule {}
