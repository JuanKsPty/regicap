import { Module } from '@nestjs/common';
import { ModulosController } from './modulos.controller';
import { ModulosRepository } from './modulos.repository';
import { ModulosService } from './modulos.service';

@Module({
  controllers: [ModulosController],
  providers: [ModulosService, ModulosRepository],
  exports: [ModulosService, ModulosRepository],
})
export class ModulosModule {}
