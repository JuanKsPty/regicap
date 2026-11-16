import { Module } from '@nestjs/common';
import { ProgresoModule } from '../progreso/progreso.module';
import { ResultadosController } from './resultados.controller';
import { ResultadosRepository } from './resultados.repository';
import { ResultadosService } from './resultados.service';

@Module({
  imports: [ProgresoModule],
  controllers: [ResultadosController],
  providers: [ResultadosService, ResultadosRepository],
  exports: [ResultadosService],
})
export class ResultadosModule {}
