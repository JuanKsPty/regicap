import { Injectable } from '@nestjs/common';
import type { EstadoInscripcion } from '@regicap/types';
import { PrismaService } from '../prisma/prisma.service';

/** Acceso a datos de inscripciones; las consultas del Participante siempre llevan su id (del token). */
@Injectable()
export class InscripcionesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Listado Activas / Historial + capacitación y empresa en una consulta. */
  findByParticipante(participanteId: string, estados: EstadoInscripcion[]) {
    return this.prisma.inscripcion.findMany({
      where: { participanteId, estado: { in: estados } },
      orderBy: { fechaInscripcion: 'desc' },
      include: { capacitacion: { select: { id: true, nombre: true, empresa: { select: { nombre: true } } } } },
    });
  }

  /** Conteo por estado con groupBy: las 3 métricas del resumen en una sola consulta. */
  async contarPorEstado(participanteId: string): Promise<Record<EstadoInscripcion, number>> {
    const filas = await this.prisma.inscripcion.groupBy({ by: ['estado'], where: { participanteId }, _count: { _all: true } });
    const base: Record<EstadoInscripcion, number> = { PENDIENTE: 0, EN_CURSO: 0, COMPLETADA: 0, CANCELADA: 0 };
    for (const f of filas) base[f.estado] = f._count._all;
    return base;
  }

  /**
   * Catálogo: solo PUBLICADAS (índice capacitacion(estado)) en las que el
   * Participante no tiene una inscripción activa; paginado. Items + total en una transacción.
   */
  async catalogo(participanteId: string, page: number, pageSize: number) {
    const where = {
      estado: 'PUBLICADA' as const,
      inscripciones: { none: { participanteId, estado: { not: 'CANCELADA' as const } } },
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.capacitacion.findMany({
        where,
        orderBy: [{ creadoEn: 'desc' }, { nombre: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, nombre: true, duracion: true, empresa: { select: { nombre: true } }, _count: { select: { modulos: true } } },
      }),
      this.prisma.capacitacion.count({ where }),
    ]);
    return { items, total };
  }

  findActiva(participanteId: string, capacitacionId: string) {
    return this.prisma.inscripcion.findFirst({ where: { participanteId, capacitacionId, estado: { not: 'CANCELADA' } } });
  }

  /** Inscribe validando la capacitación dentro de una transacción (la fila se comparte con el borrado). */
  inscribir(participanteId: string, capacitacionId: string) {
    return this.prisma.$transaction(async (tx) => {
      // FOR SHARE: una eliminación concurrente (FOR UPDATE) espera a que termine esta inscripción.
      const filas = await tx.$queryRaw<{ estado: string }[]>`
        SELECT estado::text AS estado FROM capacitacion WHERE id = ${capacitacionId}::uuid FOR SHARE`;
      if (!filas.length || filas[0]!.estado !== 'PUBLICADA') return { disponible: false as const };
      const previa = await tx.inscripcion.findFirst({ where: { participanteId, capacitacionId, estado: { not: 'CANCELADA' } } });
      if (previa) return { disponible: true as const, yaInscrito: true as const };
      const nueva = await tx.inscripcion.create({
        data: { participanteId, capacitacionId, estado: 'PENDIENTE' },
        include: { capacitacion: { select: { id: true, nombre: true, empresa: { select: { nombre: true } } } } },
      });
      return { disponible: true as const, yaInscrito: false as const, inscripcion: nueva };
    });
  }

  findDeParticipante(id: string, participanteId: string) {
    return this.prisma.inscripcion.findFirst({ where: { id, participanteId } });
  }

  async actualizarEstado(id: string, estado: EstadoInscripcion) {
    return this.prisma.inscripcion.update({
      where: { id },
      data: { estado },
      include: { capacitacion: { select: { id: true, nombre: true, empresa: { select: { nombre: true } } } } },
    });
  }
}
