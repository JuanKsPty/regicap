import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, StreamableFile } from '@nestjs/common';
import {
  filtrosResultadosSchema,
  type AnalisisDto,
  type AnalisisParticipanteDto,
  type DetalleCapacitacionDto,
  type FiltrosResultados,
  type ResultadosDto,
} from '@regicap/types';
import { z } from 'zod';
import { CurrentUser, empresaDe, Roles, type UsuarioAuth } from '../common/decorators';
import { zod } from '../common/zod-validation.pipe';
import { ResultadosService } from './resultados.service';

const decisionSchema = z.object({
  clave: z.string().min(1).max(120),
  aplicada: z.boolean(),
});

/** CU-08 Consultar resultados · CU-09 Analizar resultados (Administrador de una Empresa). */
@Controller('admin')
@Roles('ADMINISTRADOR')
export class ResultadosController {
  constructor(private readonly servicio: ResultadosService) {}

  @Get('resultados')
  consultar(@CurrentUser() user: UsuarioAuth, @Query(zod(filtrosResultadosSchema)) filtros: FiltrosResultados): Promise<ResultadosDto> {
    return this.servicio.consultar(empresaDe(user), filtros);
  }

  @Get('resultados/exportar')
  async exportar(@CurrentUser() user: UsuarioAuth, @Query(zod(filtrosResultadosSchema)) filtros: FiltrosResultados): Promise<StreamableFile> {
    const buf = await this.servicio.exportarXlsx(empresaDe(user), filtros);
    const fecha = new Date().toISOString().slice(0, 10);
    return new StreamableFile(buf, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="regicap-resultados-${fecha}.xlsx"`,
    });
  }

  @Get('resultados/capacitaciones/:id')
  detalle(@CurrentUser() user: UsuarioAuth, @Param('id', new ParseUUIDPipe()) id: string): Promise<DetalleCapacitacionDto> {
    return this.servicio.detalleCapacitacion(empresaDe(user), id);
  }

  @Get('participantes/:id/analisis')
  analisisParticipante(@CurrentUser() user: UsuarioAuth, @Param('id', new ParseUUIDPipe()) id: string): Promise<AnalisisParticipanteDto> {
    return this.servicio.analisisParticipante(empresaDe(user), id);
  }

  @Get('analisis')
  analizar(@CurrentUser() user: UsuarioAuth): Promise<AnalisisDto> {
    return this.servicio.analizar(empresaDe(user));
  }

  @HttpCode(204)
  @Post('decisiones')
  async decision(@CurrentUser() user: UsuarioAuth, @Body(zod(decisionSchema)) dto: { clave: string; aplicada: boolean }): Promise<void> {
    await this.servicio.marcarDecision(empresaDe(user), dto.clave, dto.aplicada);
  }
}
