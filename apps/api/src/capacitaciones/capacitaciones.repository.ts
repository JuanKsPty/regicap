import { Injectable } from '@nestjs/common';
import { Prisma } from '@regicap/db';
import type { EstadoCapacitacion } from '@regicap/types';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Repositorio de Capacitaciones. Toda consulta de una Empresa pasa por métodos
 * `Scoped`: el `empresaId` sale del token, nunca del cuerpo (D-07 / RNF-03).
 */
@Injectable()
export class CapacitacionesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista con nº de módulos en una sola consulta (sin N+1). */
  findByEmpresa(empresaId: string) {
    return this.prisma.capacitacion.findMany({
      where: { empresaId },
      orderBy: { creadoEn: 'desc' },
      include: { _count: { select: { modulos: true } } },
    });
  }

  findOneScoped(id: string, empresaId: string) {
    return this.prisma.capacitacion.findFirst({
      where: { id, empresaId },
      include: { _count: { select: { modulos: true } } },
    });
  }

  async existsNombre(empresaId: string, nombre: string, excluirId?: string): Promise<boolean> {
    const n = await this.prisma.capacitacion.count({
      where: { empresaId, nombre: { equals: nombre, mode: 'insensitive' }, ...(excluirId ? { id: { not: excluirId } } : {}) },
    });
    return n > 0;
  }

  create(data: { empresaId: string; nombre: string; duracion: string; estado: EstadoCapacitacion }) {
    return this.prisma.capacitacion.create({ data, include: { _count: { select: { modulos: true } } } });
  }

  update(id: string, data: Prisma.CapacitacionUpdateInput) {
    return this.prisma.capacitacion.update({ where: { id }, data, include: { _count: { select: { modulos: true } } } });
  }

  /** Suma de pesos del test de cada módulo que tiene preguntas. */
  async pesosPorModulo(capacitacionId: string): Promise<{ moduloId: string; nombre: string; orden: number; peso: number }[]> {
    const modulos = await this.prisma.modulo.findMany({
      where: { capacitacionId },
      orderBy: { orden: 'asc' },
      select: { id: true, nombre: true, orden: true, preguntas: { select: { peso: true } } },
    });
    return modulos
      .filter((m) => m.preguntas.length > 0)
      .map((m) => ({
        moduloId: m.id,
        nombre: m.nombre,
        orden: m.orden,
        peso: m.preguntas.reduce((a, p) => a + Number(p.peso), 0),
      }));
  }

  /** Claves S3 de los PDF de una capacitación (para limpiar el almacenamiento al eliminar). */
  async clavesArchivos(capacitacionId: string): Promise<string[]> {
    const acts = await this.prisma.actividad.findMany({
      where: { modulo: { capacitacionId }, archivoKey: { not: null } },
      select: { archivoKey: true },
    });
    return acts.map((a) => a.archivoKey!).filter(Boolean);
  }

  /**
   * Elimina en UNA transacción (RNF-10, D-13): bloquea la fila, cuenta las
   * inscripciones activas y borra; la cascada de FK elimina módulos,
   * actividades y preguntas. Devuelve false si hay inscritos activos.
   */
  eliminarSiSinInscritos(id: string): Promise<{ eliminado: boolean; claves: string[] }> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM capacitacion WHERE id = ${id}::uuid FOR UPDATE`;
      const activas = await tx.inscripcion.count({ where: { capacitacionId: id, estado: { in: ['PENDIENTE', 'EN_CURSO'] } } });
      if (activas > 0) return { eliminado: false, claves: [] };
      const acts = await tx.actividad.findMany({
        where: { modulo: { capacitacionId: id }, archivoKey: { not: null } },
        select: { archivoKey: true },
      });
      await tx.capacitacion.delete({ where: { id } });
      return { eliminado: true, claves: acts.map((a) => a.archivoKey!).filter(Boolean) };
    });
  }
}
