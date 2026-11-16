import { Body, Controller, Delete, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
  actividadPatchSchema,
  actividadSchema,
  archivoSolicitudSchema,
  moduloPatchSchema,
  moduloSchema,
  moverModuloSchema,
  preguntaSchema,
  type ActividadInput,
  type ActividadPatchInput,
  type ArchivoSolicitudInput,
  type ModuloInput,
  type PreguntaInput,
} from '@regicap/types';
import { CurrentUser, empresaDe, Roles, type UsuarioAuth } from '../common/decorators';
import { zod } from '../common/zod-validation.pipe';
import { ModulosService } from './modulos.service';

const uuid = () => new ParseUUIDPipe();

/** CU-12 Gestionar módulos (Empresa): módulos, actividades, test y subida de PDF. */
@Controller('empresa')
@Roles('EMPRESA')
export class ModulosController {
  constructor(private readonly servicio: ModulosService) {}

  @Post('capacitaciones/:capacitacionId/modulos')
  crearModulo(
    @CurrentUser() user: UsuarioAuth,
    @Param('capacitacionId', uuid()) capacitacionId: string,
    @Body(zod(moduloSchema)) dto: ModuloInput,
  ) {
    return this.servicio.crearModulo(empresaDe(user), capacitacionId, dto.nombre, dto.tipo ?? 'CONTENIDO');
  }

  @Patch('modulos/:id')
  renombrar(@CurrentUser() user: UsuarioAuth, @Param('id', uuid()) id: string, @Body(zod(moduloPatchSchema)) dto: { nombre: string }) {
    return this.servicio.renombrarModulo(empresaDe(user), id, dto.nombre);
  }

  @HttpCode(204)
  @Delete('modulos/:id')
  async eliminarModulo(@CurrentUser() user: UsuarioAuth, @Param('id', uuid()) id: string): Promise<void> {
    await this.servicio.eliminarModulo(empresaDe(user), id);
  }

  @HttpCode(204)
  @Post('modulos/:id/mover')
  async mover(
    @CurrentUser() user: UsuarioAuth,
    @Param('id', uuid()) id: string,
    @Body(zod(moverModuloSchema)) dto: { direccion: -1 | 1 },
  ): Promise<void> {
    await this.servicio.moverModulo(empresaDe(user), id, dto.direccion);
  }

  @Post('archivos/subida')
  solicitarSubida(@CurrentUser() user: UsuarioAuth, @Body(zod(archivoSolicitudSchema)) dto: ArchivoSolicitudInput) {
    return this.servicio.solicitarSubida(empresaDe(user), dto);
  }

  @Post('modulos/:id/actividades')
  crearActividad(@CurrentUser() user: UsuarioAuth, @Param('id', uuid()) id: string, @Body(zod(actividadSchema)) dto: ActividadInput) {
    return this.servicio.crearActividad(empresaDe(user), id, dto);
  }

  @Patch('actividades/:id')
  editarActividad(@CurrentUser() user: UsuarioAuth, @Param('id', uuid()) id: string, @Body(zod(actividadPatchSchema)) dto: ActividadPatchInput) {
    return this.servicio.editarActividad(empresaDe(user), id, dto);
  }

  @HttpCode(204)
  @Delete('actividades/:id')
  async eliminarActividad(@CurrentUser() user: UsuarioAuth, @Param('id', uuid()) id: string): Promise<void> {
    await this.servicio.eliminarActividad(empresaDe(user), id);
  }

  @Post('modulos/:id/preguntas')
  crearPregunta(@CurrentUser() user: UsuarioAuth, @Param('id', uuid()) id: string, @Body(zod(preguntaSchema)) dto: PreguntaInput) {
    return this.servicio.crearPregunta(empresaDe(user), id, dto);
  }

  @HttpCode(204)
  @Delete('preguntas/:id')
  async eliminarPregunta(@CurrentUser() user: UsuarioAuth, @Param('id', uuid()) id: string): Promise<void> {
    await this.servicio.eliminarPregunta(empresaDe(user), id);
  }
}
