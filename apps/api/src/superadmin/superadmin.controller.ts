import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  actualizarUsuarioSchema,
  cambiarPasswordSchema,
  crearUsuarioSchema,
  filtroUsuariosSchema,
  type ActualizarUsuarioInput,
  type CambiarPasswordInput,
  type CrearUsuarioInput,
  type EmpresaGestionDto,
  type FiltroUsuarios,
  type UsuarioGestionDto,
} from '@regicap/types';
import { CurrentUser, Roles, type UsuarioAuth } from '../common/decorators';
import { zod } from '../common/zod-validation.pipe';
import { SuperadminService } from './superadmin.service';

const uuid = () => new ParseUUIDPipe();

/** Gestión de cuentas y empresas (solo SUPERADMIN). */
@Controller('superadmin')
@Roles('SUPERADMIN')
export class SuperadminController {
  constructor(private readonly servicio: SuperadminService) {}

  @Get('usuarios')
  usuarios(@Query(zod(filtroUsuariosSchema)) f: FiltroUsuarios): Promise<UsuarioGestionDto[]> {
    return this.servicio.usuarios(f);
  }

  @Get('empresas')
  empresas(): Promise<EmpresaGestionDto[]> {
    return this.servicio.empresas();
  }

  @Post('usuarios')
  crear(@Body(zod(crearUsuarioSchema)) dto: CrearUsuarioInput): Promise<UsuarioGestionDto> {
    return this.servicio.crear(dto);
  }

  @Patch('usuarios/:id')
  actualizar(@CurrentUser() actor: UsuarioAuth, @Param('id', uuid()) id: string, @Body(zod(actualizarUsuarioSchema)) dto: ActualizarUsuarioInput): Promise<UsuarioGestionDto> {
    return this.servicio.actualizar(actor.id, id, dto);
  }

  @HttpCode(204)
  @Post('usuarios/:id/password')
  async password(@Param('id', uuid()) id: string, @Body(zod(cambiarPasswordSchema)) dto: CambiarPasswordInput): Promise<void> {
    await this.servicio.cambiarPassword(id, dto.password);
  }

  @HttpCode(204)
  @Delete('usuarios/:id')
  async eliminar(@CurrentUser() actor: UsuarioAuth, @Param('id', uuid()) id: string): Promise<void> {
    await this.servicio.eliminar(actor.id, id);
  }
}
