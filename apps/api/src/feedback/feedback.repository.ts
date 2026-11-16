import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedbackRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Feedback enviado por participante dentro de la Empresa (una consulta agrupada). */
  async contarPorParticipante(empresaId: string): Promise<Map<string, number>> {
    const filas = await this.prisma.feedback.groupBy({
      by: ['participanteId'],
      where: { capacitacion: { empresaId } },
      _count: { _all: true },
    });
    return new Map(filas.map((f) => [f.participanteId, f._count._all]));
  }

  /** Última respuesta ENVIADA (con su calificación) del participante en la capacitación. */
  ultimaRespuesta(participanteId: string, capacitacionId: string) {
    return this.prisma.respuesta.findFirst({
      where: { estado: 'ENVIADA', inscripcion: { participanteId, capacitacionId, estado: { not: 'CANCELADA' } } },
      orderBy: { fechaEnvio: 'desc' },
      include: { calificacion: true, modulo: { select: { nombre: true } } },
    });
  }

  historial(empresaId: string, participanteId: string, capacitacionId: string) {
    return this.prisma.feedback.findMany({
      where: { participanteId, capacitacionId, capacitacion: { empresaId } },
      orderBy: { fecha: 'desc' },
      select: { id: true, texto: true, fecha: true },
    });
  }

  /** ¿El participante está (o estuvo) inscrito en una capacitación de esta Empresa? */
  async tieneInscripcion(empresaId: string, participanteId: string, capacitacionId: string): Promise<boolean> {
    const n = await this.prisma.inscripcion.count({
      where: { participanteId, capacitacionId, capacitacion: { empresaId }, estado: { not: 'CANCELADA' } },
    });
    return n > 0;
  }

  crear(data: { administradorId: string; participanteId: string; capacitacionId: string; texto: string }) {
    return this.prisma.feedback.create({ data });
  }

  /** CU-06: todo el feedback del participante (vigentes e históricas) con su capacitación. */
  delParticipante(participanteId: string) {
    return this.prisma.feedback.findMany({
      where: { participanteId },
      orderBy: { fecha: 'desc' },
      include: {
        administrador: { select: { nombre: true } },
        capacitacion: { select: { id: true, nombre: true, empresa: { select: { nombre: true } } } },
      },
    });
  }

  /** Inscripción más reciente del participante en cada capacitación dada (para estado y puntaje). */
  inscripcionesDe(participanteId: string, capacitacionIds: string[]) {
    return this.prisma.inscripcion.findMany({
      where: { participanteId, capacitacionId: { in: capacitacionIds } },
      orderBy: { fechaInscripcion: 'desc' },
      select: { id: true, capacitacionId: true, estado: true },
    });
  }

  puntajes(inscripcionIds: string[]) {
    if (!inscripcionIds.length) return Promise.resolve([]);
    return this.prisma.calificacion.findMany({
      where: { estado: 'CALIFICADA', puntaje: { not: null }, respuesta: { inscripcionId: { in: inscripcionIds } } },
      select: { puntaje: true, respuesta: { select: { inscripcionId: true } } },
    });
  }
}
