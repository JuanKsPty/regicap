import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { contenidoRespuestaSchema, type ContenidoRespuesta, type ModuloDetalleDto } from '@regicap/types';
import { CurrentUser, Roles, type UsuarioAuth } from '../common/decorators';
import { zod } from '../common/zod-validation.pipe';
import { RespuestasService } from './respuestas.service';

const uuid = () => new ParseUUIDPipe();

/** CU-05 Resolver módulos (Participante). */
@Controller('participante/inscripciones/:inscripcionId/modulos/:moduloId')
@Roles('PARTICIPANTE')
export class RespuestasController {
  constructor(private readonly servicio: RespuestasService) {}

  @Get()
  detalle(
    @CurrentUser() user: UsuarioAuth,
    @Param('inscripcionId', uuid()) inscripcionId: string,
    @Param('moduloId', uuid()) moduloId: string,
  ): Promise<ModuloDetalleDto> {
    return this.servicio.detalle(user.id, inscripcionId, moduloId);
  }

  @Put('borrador')
  borrador(
    @CurrentUser() user: UsuarioAuth,
    @Param('inscripcionId', uuid()) inscripcionId: string,
    @Param('moduloId', uuid()) moduloId: string,
    @Body(zod(contenidoRespuestaSchema)) dto: ContenidoRespuesta,
  ): Promise<ModuloDetalleDto> {
    return this.servicio.guardarBorrador(user.id, inscripcionId, moduloId, dto);
  }

  @HttpCode(200)
  @Post('enviar')
  enviar(
    @CurrentUser() user: UsuarioAuth,
    @Param('inscripcionId', uuid()) inscripcionId: string,
    @Param('moduloId', uuid()) moduloId: string,
    @Body(zod(contenidoRespuestaSchema)) dto: ContenidoRespuesta,
  ): Promise<ModuloDetalleDto> {
    return this.servicio.enviar(user.id, inscripcionId, moduloId, dto);
  }
}
