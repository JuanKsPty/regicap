import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import type { ModuloEstadoDto, ProgresoDto } from '@regicap/types';
import { CurrentUser, Roles, type UsuarioAuth } from '../common/decorators';
import { ProgresoService } from './progreso.service';

@Controller('participante/progreso')
@Roles('PARTICIPANTE')
export class ProgresoController {
  constructor(private readonly servicio: ProgresoService) {}

  @Get()
  activas(@CurrentUser() user: UsuarioAuth): Promise<ProgresoDto[]> {
    return this.servicio.activasConProgreso(user.id);
  }

  @Get(':inscripcionId/modulos')
  modulos(@CurrentUser() user: UsuarioAuth, @Param('inscripcionId', new ParseUUIDPipe()) id: string): Promise<ModuloEstadoDto[]> {
    return this.servicio.modulosDeInscripcion(user.id, id);
  }
}
