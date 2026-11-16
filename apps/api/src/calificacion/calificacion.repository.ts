import { Injectable } from '@nestjs/common';
import { Prisma } from '@regicap/db';
import { PrismaService } from '../prisma/prisma.service';
import type { Nivel } from '@regicap/types';

@Injectable()
export class CalificacionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Respuesta enviada con lo necesario para calificarla. */
  findRespuestaParaCalificar(respuestaId: string) {
    return this.prisma.respuesta.findUnique({
      where: { id: respuestaId },
      include: {
        calificacion: true,
        modulo: { select: { id: true, tipo: true, capacitacionId: true } },
      },
    });
  }

  /** Preguntas a evaluar: las del módulo; el módulo TEST reúne además las de los módulos de contenido. */
  preguntasDeEvaluacion(modulo: { id: string; tipo: 'CONTENIDO' | 'TEST'; capacitacionId: string }) {
    return this.prisma.pregunta.findMany({
      where:
        modulo.tipo === 'TEST'
          ? { modulo: { capacitacionId: modulo.capacitacionId } }
          : { moduloId: modulo.id },
      orderBy: [{ modulo: { orden: 'asc' } }, { creadaEn: 'asc' }],
    });
  }

  marcarCalificada(
    respuestaId: string,
    data: { puntaje: number; nivel: Nivel; criterioMasBajo: string | null; detalle: unknown; intentos: number },
  ) {
    return this.prisma.calificacion.update({
      where: { respuestaId },
      data: {
        estado: 'CALIFICADA',
        puntaje: data.puntaje,
        nivel: data.nivel,
        criterioMasBajo: data.criterioMasBajo,
        detalle: data.detalle as Prisma.InputJsonValue,
        intentos: data.intentos,
        ultimoError: null,
      },
    });
  }

  registrarFallo(respuestaId: string, intentos: number, error: string, definitivo: boolean) {
    return this.prisma.calificacion.updateMany({
      where: { respuestaId, estado: { not: 'CALIFICADA' } },
      data: { intentos, ultimoError: error.slice(0, 500), ...(definitivo ? { estado: 'ERROR' as const } : {}) },
    });
  }

  /** Calificaciones PENDIENTE sin movimiento (el trabajo pudo perderse si Redis falló). */
  pendientesAntiguas(minutos: number) {
    return this.prisma.calificacion.findMany({
      where: { estado: 'PENDIENTE', actualizadaEn: { lt: new Date(Date.now() - minutos * 60_000) } },
      select: { respuestaId: true },
      take: 200,
    });
  }

  /** CU-07 FA: reencolar las calificaciones en ERROR de una Empresa (scoped). */
  async reiniciarErrores(empresaId: string): Promise<string[]> {
    const filas = await this.prisma.calificacion.findMany({
      where: { estado: 'ERROR', respuesta: { inscripcion: { capacitacion: { empresaId } } } },
      select: { respuestaId: true },
    });
    if (!filas.length) return [];
    await this.prisma.calificacion.updateMany({
      where: { respuestaId: { in: filas.map((f) => f.respuestaId) } },
      data: { estado: 'PENDIENTE', intentos: 0, ultimoError: null },
    });
    return filas.map((f) => f.respuestaId);
  }
}
