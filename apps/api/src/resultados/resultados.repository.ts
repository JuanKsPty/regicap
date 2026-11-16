import { Injectable } from '@nestjs/common';
import { Prisma } from '@regicap/db';
import { rangoCohorte, type FiltrosResultados } from '@regicap/types';
import { PrismaService } from '../prisma/prisma.service';

/** Todas las consultas de resultados se acotan a la Empresa del token (RNF-03). */
@Injectable()
export class ResultadosRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Inscripciones vigentes (no canceladas) de la Empresa con los filtros del dashboard. */
  inscripciones(empresaId: string, f: FiltrosResultados) {
    const where: Prisma.InscripcionWhereInput = {
      capacitacion: { empresaId },
      estado: f.estado && f.estado !== 'CANCELADA' ? f.estado : { not: 'CANCELADA' },
      ...(f.capacitacionId ? { capacitacionId: f.capacitacionId } : {}),
      ...(f.participanteId ? { participanteId: f.participanteId } : {}),
    };
    const fecha: Prisma.DateTimeFilter = {};
    if (f.cohorte) {
      const r = rangoCohorte(f.cohorte);
      fecha.gte = r.desde;
      fecha.lt = r.hasta;
    }
    if (f.desde) fecha.gte = new Date(`${f.desde}T00:00:00.000Z`);
    if (f.hasta) fecha.lt = new Date(new Date(`${f.hasta}T00:00:00.000Z`).getTime() + 86_400_000);
    if (Object.keys(fecha).length) where.fechaInscripcion = fecha;

    return this.prisma.inscripcion.findMany({
      where,
      orderBy: { fechaInscripcion: 'desc' },
      include: {
        participante: { select: { id: true, nombre: true, email: true } },
        capacitacion: { select: { id: true, nombre: true } },
      },
    });
  }

  /** Puntajes de módulos CALIFICADOS agrupables por inscripción / módulo (una consulta). */
  calificadas(inscripcionIds: string[]) {
    if (!inscripcionIds.length) return Promise.resolve([]);
    return this.prisma.calificacion.findMany({
      where: { estado: 'CALIFICADA', puntaje: { not: null }, respuesta: { inscripcionId: { in: inscripcionIds } } },
      select: { puntaje: true, respuesta: { select: { inscripcionId: true, moduloId: true } } },
    });
  }

  capacitacionesDeEmpresa(empresaId: string) {
    return this.prisma.capacitacion.findMany({
      where: { empresaId },
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true, estado: true },
    });
  }

  findCapacitacionScoped(id: string, empresaId: string) {
    return this.prisma.capacitacion.findFirst({
      where: { id, empresaId },
      select: { id: true, nombre: true, empresa: { select: { nombre: true } }, modulos: { orderBy: { orden: 'asc' }, select: { id: true, nombre: true, orden: true } } },
    });
  }

  /** Estado de calificaciones de la Empresa (para el aviso de reintento). */
  async contarCalificaciones(empresaId: string): Promise<{ pendientes: number; errores: number }> {
    const filas = await this.prisma.calificacion.groupBy({
      by: ['estado'],
      where: { estado: { in: ['PENDIENTE', 'ERROR'] }, respuesta: { inscripcion: { capacitacion: { empresaId } } } },
      _count: { _all: true },
    });
    const get = (e: string) => filas.find((f) => f.estado === e)?._count._all ?? 0;
    return { pendientes: get('PENDIENTE'), errores: get('ERROR') };
  }

  /** Inscripciones de un participante en la Empresa con módulos, respuestas y calificaciones. */
  inscripcionesConDetalle(empresaId: string, participanteId: string) {
    return this.prisma.inscripcion.findMany({
      where: { participanteId, capacitacion: { empresaId }, estado: { not: 'CANCELADA' } },
      orderBy: { fechaInscripcion: 'desc' },
      include: {
        participante: { select: { id: true, nombre: true, email: true } },
        capacitacion: { select: { id: true, nombre: true, modulos: { orderBy: { orden: 'asc' }, select: { id: true, nombre: true, orden: true } } } },
        respuestas: { where: { estado: 'ENVIADA' }, include: { calificacion: true } },
      },
    });
  }

  aplicadas(empresaId: string) {
    return this.prisma.decisionAplicada.findMany({ where: { empresaId }, select: { clave: true } });
  }

  async marcarDecision(empresaId: string, clave: string, aplicada: boolean) {
    if (aplicada) {
      await this.prisma.decisionAplicada.upsert({
        where: { empresaId_clave: { empresaId, clave } },
        create: { empresaId, clave },
        update: {},
      });
    } else {
      await this.prisma.decisionAplicada.deleteMany({ where: { empresaId, clave } });
    }
  }
}
