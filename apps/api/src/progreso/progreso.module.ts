import { Module } from '@nestjs/common';
import { ProgresoController } from './progreso.controller';
import { ProgresoRepository } from './progreso.repository';
import { ProgresoService } from './progreso.service';

@Module({
  controllers: [ProgresoController],
  providers: [ProgresoService, ProgresoRepository],
  exports: [ProgresoService, ProgresoRepository],
})
export class ProgresoModule {}
