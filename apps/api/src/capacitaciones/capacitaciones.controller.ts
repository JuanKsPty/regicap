import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
  capacitacionPatchSchema,
  capacitacionSchema,
  type CapacitacionDetalleDto,
  type CapacitacionDto,
  type CapacitacionInput,
  type CapacitacionPatchInput,
} from '@regicap/types';
import { CurrentUser, empresaDe, Roles, type UsuarioAuth } from '../common/decorators';
import { zod } from '../common/zod-validation.pipe';
import { ModulosService } from '../modulos/modulos.service';
import { CapacitacionesService } from './capacitaciones.service';

/** Los controladores solo validan la entrada (DTO) y la autorización por rol; las reglas viven en el servicio. */
@Controller('empresa/capacitaciones')
@Roles('EMPRESA')
export class CapacitacionesController {
  constructor(
    private readonly servicio: CapacitacionesService,
    private readonly modulos: ModulosService,
  ) {}

  @Get()
  listar(@CurrentUser() user: UsuarioAuth): Promise<CapacitacionDto[]> {
    return this.servicio.listarDeEmpresa(empresaDe(user));
  }

  @Post()
  registrar(@CurrentUser() user: UsuarioAuth, @Body(zod(capacitacionSchema)) dto: CapacitacionInput): Promise<CapacitacionDto> {
    return this.servicio.registrar(empresaDe(user), dto);
  }

  /** Detalle con módulos, actividades y preguntas (CU-12). */
  @Get(':id')
  detalle(@CurrentUser() user: UsuarioAuth, @Param('id', new ParseUUIDPipe()) id: string): Promise<CapacitacionDetalleDto> {
    return this.modulos.detalleCapacitacion(empresaDe(user), id);
  }

  @Patch(':id')
  editar(
    @CurrentUser() user: UsuarioAuth,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(zod(capacitacionPatchSchema)) dto: CapacitacionPatchInput,
  ): Promise<CapacitacionDto> {
    return this.servicio.editar(empresaDe(user), id, dto);
  }

  @HttpCode(200)
  @Post(':id/publicar')
  publicar(@CurrentUser() user: UsuarioAuth, @Param('id', new ParseUUIDPipe()) id: string): Promise<CapacitacionDto> {
    return this.servicio.publicar(empresaDe(user), id);
  }

  @HttpCode(200)
  @Post(':id/despublicar')
  despublicar(@CurrentUser() user: UsuarioAuth, @Param('id', new ParseUUIDPipe()) id: string): Promise<CapacitacionDto> {
    return this.servicio.despublicar(empresaDe(user), id);
  }

  @HttpCode(204)
  @Delete(':id')
  async eliminar(@CurrentUser() user: UsuarioAuth, @Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.servicio.eliminar(empresaDe(user), id);
  }
}
