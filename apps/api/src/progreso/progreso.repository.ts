import { Injectable } from '@nestjs/common';
import type { Prisma } from '@regicap/db';
import { PrismaService } from '../prisma/prisma.service';

export type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class ProgresoRepository {
  constructor(private readonly prisma: PrismaService) {}

  activasDeParticipante(participanteId: string) {
    return this.prisma.inscripcion.findMany({
      where: { participanteId, estado: { in: ['PENDIENTE', 'EN_CURSO'] } },
      orderBy: { fechaInscripcion: 'desc' },
      include: { capacitacion: { select: { id: true, nombre: true, empresa: { select: { nombre: true } } } } },
    });
  }

  /** Respuestas ENVIADA por inscripción en UNA consulta agrupada (sin N+1). */
  async enviadasPorInscripcion(inscripcionIds: string[], db: Db = this.prisma): Promise<Map<string, number>> {
    if (!inscripcionIds.length) return new Map();
    const filas = await db.respuesta.groupBy({
      by: ['inscripcionId'],
      where: { inscripcionId: { in: inscripcionIds }, estado: 'ENVIADA' },
      _count: { _all: true },
    });
    return new Map(filas.map((f) => [f.inscripcionId, f._count._all]));
  }

  async totalModulosPorCapacitacion(capacitacionIds: string[], db: Db = this.prisma): Promise<Map<string, number>> {
    if (!capacitacionIds.length) return new Map();
    const filas = await db.modulo.groupBy({
      by: ['capacitacionId'],
      where: { capacitacionId: { in: capacitacionIds } },
      _count: { _all: true },
    });
    return new Map(filas.map((f) => [f.capacitacionId, f._count._all]));
  }

  /** Inscripción del Participante (404 si es de otro usuario) con datos de la capacitación. */
  findDeParticipante(id: string, participanteId: string) {
    return this.prisma.inscripcion.findFirst({
      where: { id, participanteId },
      include: { capacitacion: { select: { id: true, nombre: true, empresa: { select: { nombre: true } } } } },
    });
  }

  /** Módulos de la capacitación con su respuesta y calificación para ESA inscripción. */
  modulosConRespuesta(capacitacionId: string, inscripcionId: string) {
    return this.prisma.modulo.findMany({
      where: { capacitacionId },
      orderBy: { orden: 'asc' },
      include: {
        _count: { select: { actividades: true, preguntas: true } },
        respuestas: { where: { inscripcionId }, include: { calificacion: true } },
      },
    });
  }

  async actualizarEstado(inscripcionId: string, estado: 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADA', db: Db = this.prisma) {
    await db.inscripcion.update({ where: { id: inscripcionId }, data: { estado } });
  }

  async inscripcionBasica(id: string, db: Db = this.prisma) {
    return db.inscripcion.findUnique({ where: { id }, select: { id: true, estado: true, capacitacionId: true } });
  }
}
