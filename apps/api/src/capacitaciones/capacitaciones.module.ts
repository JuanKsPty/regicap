import { Module } from '@nestjs/common';
import { ModulosModule } from '../modulos/modulos.module';
import { CapacitacionesController } from './capacitaciones.controller';
import { CapacitacionesRepository } from './capacitaciones.repository';
import { CapacitacionesService } from './capacitaciones.service';

@Module({
  imports: [ModulosModule],
  controllers: [CapacitacionesController],
  providers: [CapacitacionesService, CapacitacionesRepository],
  exports: [CapacitacionesService, CapacitacionesRepository],
})
export class CapacitacionesModule {}
