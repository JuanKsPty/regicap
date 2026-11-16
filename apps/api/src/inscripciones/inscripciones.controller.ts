import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  inscribirseSchema,
  vistaInscripcionesSchema,
  type CatalogoDto,
  type InscribirseInput,
  type InscripcionDto,
  type InscripcionesRespuestaDto,
} from '@regicap/types';
import { z } from 'zod';
import { CurrentUser, Roles, type UsuarioAuth } from '../common/decorators';
import { zod } from '../common/zod-validation.pipe';
import { InscripcionesService } from './inscripciones.service';

const pageSchema = z.coerce.number().int().min(1).catch(1);

@Controller()
@Roles('PARTICIPANTE')
export class InscripcionesController {
  constructor(private readonly servicio: InscripcionesService) {}

  @Get('participante/inscripciones')
  listar(@CurrentUser() user: UsuarioAuth, @Query('vista', zod(vistaInscripcionesSchema)) vista: 'activas' | 'historial'): Promise<InscripcionesRespuestaDto> {
    return this.servicio.listar(user.id, vista);
  }

  @Get('catalogo')
  catalogo(@CurrentUser() user: UsuarioAuth, @Query('page', zod(pageSchema)) page: number): Promise<CatalogoDto> {
    return this.servicio.catalogo(user.id, page);
  }

  @Post('participante/inscripciones')
  inscribirse(@CurrentUser() user: UsuarioAuth, @Body(zod(inscribirseSchema)) dto: InscribirseInput): Promise<InscripcionDto> {
    return this.servicio.inscribirse(user.id, dto.capacitacionId);
  }

  @HttpCode(200)
  @Patch('participante/inscripciones/:id/cancelar')
  cancelar(@CurrentUser() user: UsuarioAuth, @Param('id', new ParseUUIDPipe()) id: string): Promise<InscripcionDto> {
    return this.servicio.cancelar(user.id, id);
  }
}
