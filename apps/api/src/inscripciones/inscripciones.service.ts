import { Injectable } from '@nestjs/common';
import { Prisma } from '@regicap/db';
import {
  CATALOGO_PAGE_SIZE,
  type CatalogoDto,
  type EstadoInscripcion,
  type InscripcionDto,
  type InscripcionesRespuestaDto,
  type VistaInscripciones,
} from '@regicap/types';
import { noEncontrado, reglaViolada } from '../common/errors';
import { ProgresoCalculator } from '../progreso/progreso.calculator';
import { ProgresoRepository } from '../progreso/progreso.repository';
import { Inscripcion } from './inscripcion.entity';
import { InscripcionesRepository } from './inscripciones.repository';

type FilaInscripcion = Awaited<ReturnType<InscripcionesRepository['findByParticipante']>>[number];

@Injectable()
export class InscripcionesService {
  private readonly calc = new ProgresoCalculator();

  constructor(
    private readonly repo: InscripcionesRepository,
    private readonly progresoRepo: ProgresoRepository,
  ) {}

  /** CU-03 2.1.2 — resumen (3 métricas) + inscripciones activas o historial. */
  async listar(participanteId: string, vista: VistaInscripciones): Promise<InscripcionesRespuestaDto> {
    const estados: EstadoInscripcion[] = vista === 'activas' ? ['PENDIENTE', 'EN_CURSO'] : ['COMPLETADA', 'CANCELADA'];
    const [filas, conteo] = await Promise.all([this.repo.findByParticipante(participanteId, estados), this.repo.contarPorEstado(participanteId)]);
    const activas = conteo.PENDIENTE + conteo.EN_CURSO;
    return {
      resumen: { matriculadas: activas + conteo.COMPLETADA, pendientes: activas, completadas: conteo.COMPLETADA },
      inscripciones: await this.conProgreso(filas),
    };
  }

  /** CU-03 2.1.2 — catálogo paginado de capacitaciones PUBLICADAS (12 por página). */
  async catalogo(participanteId: string, page: number): Promise<CatalogoDto> {
    const { items, total } = await this.repo.catalogo(participanteId, page, CATALOGO_PAGE_SIZE);
    return {
      items: items.map((c) => ({ capacitacionId: c.id, titulo: c.nombre, empresa: c.empresa.nombre, modulos: c._count.modulos, duracion: c.duracion })),
      total,
      page,
      pageSize: CATALOGO_PAGE_SIZE,
    };
  }

  /** CU-03 FA-2 — inscripción nueva en PENDIENTE (RF-07, FE-4). */
  async inscribirse(participanteId: string, capacitacionId: string): Promise<InscripcionDto> {
    try {
      const r = await this.repo.inscribir(participanteId, capacitacionId);
      // FE-4: relee la capacitación; si ya no está publicada (o no existe) → NO_DISPONIBLE
      if (!r.disponible) throw reglaViolada('NO_DISPONIBLE', 'Esta capacitación ya no está disponible.');
      if (r.yaInscrito) throw reglaViolada('YA_INSCRITO', 'Ya estás inscrito en esta capacitación.');
      return this.aDto(r.inscripcion, 0);
    } catch (e) {
      // Índice único parcial ante doble clic / concurrencia
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw reglaViolada('YA_INSCRITO', 'Ya estás inscrito en esta capacitación.');
      }
      throw e;
    }
  }

  /** CU-03 FA-3 — cancela solo si es del Participante y está PENDIENTE; el registro se conserva (D-12). */
  async cancelar(participanteId: string, id: string): Promise<InscripcionDto> {
    const insc = await this.repo.findDeParticipante(id, participanteId);
    if (!insc) throw noEncontrado('No se encontró la inscripción.');
    const entidad = new Inscripcion(insc.estado);
    if (!entidad.puedeCancelarse()) {
      throw reglaViolada('NO_CANCELABLE', 'Solo puedes cancelar inscripciones que aún no has iniciado.');
    }
    const actualizada = await this.repo.actualizarEstado(id, entidad.cancelar());
    return this.aDto(actualizada, 0);
  }

  private async conProgreso(filas: FilaInscripcion[]): Promise<InscripcionDto[]> {
    const enviadas = await this.progresoRepo.enviadasPorInscripcion(filas.map((f) => f.id));
    const totales = await this.progresoRepo.totalModulosPorCapacitacion([...new Set(filas.map((f) => f.capacitacionId))]);
    return filas.map((f) => this.aDto(f, this.calc.porcentaje(enviadas.get(f.id) ?? 0, totales.get(f.capacitacionId) ?? 0)));
  }

  private aDto(f: FilaInscripcion, progreso: number): InscripcionDto {
    return {
      id: f.id,
      capacitacionId: f.capacitacionId,
      titulo: f.capacitacion.nombre,
      empresa: f.capacitacion.empresa.nombre,
      estado: f.estado,
      fechaInscripcion: f.fechaInscripcion.toISOString(),
      progreso,
    };
  }
}
