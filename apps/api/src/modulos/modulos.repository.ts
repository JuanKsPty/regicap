import { Injectable } from '@nestjs/common';
import { Prisma } from '@regicap/db';
import type { TipoActividad, TipoModulo } from '@regicap/types';
import { PrismaService } from '../prisma/prisma.service';

/** Acceso a datos de módulos, actividades y preguntas. Todo `Scoped` por Empresa (RNF-03). */
@Injectable()
export class ModulosRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCapacitacionScoped(id: string, empresaId: string) {
    return this.prisma.capacitacion.findFirst({ where: { id, empresaId }, select: { id: true } });
  }

  /** Detalle completo para CU-12 (una consulta con include). */
  findDetalleScoped(id: string, empresaId: string) {
    return this.prisma.capacitacion.findFirst({
      where: { id, empresaId },
      include: {
        modulos: {
          orderBy: { orden: 'asc' },
          include: {
            actividades: { orderBy: { orden: 'asc' } },
            preguntas: { orderBy: { creadaEn: 'asc' } },
          },
        },
      },
    });
  }

  findModuloScoped(id: string, empresaId: string) {
    return this.prisma.modulo.findFirst({
      where: { id, capacitacion: { empresaId } },
      select: { id: true, capacitacionId: true, tipo: true, nombre: true },
    });
  }

  findActividadScoped(id: string, empresaId: string) {
    return this.prisma.actividad.findFirst({ where: { id, modulo: { capacitacion: { empresaId } } } });
  }

  findPreguntaScoped(id: string, empresaId: string) {
    return this.prisma.pregunta.findFirst({ where: { id, modulo: { capacitacion: { empresaId } } } });
  }

  inscripcionesActivas(capacitacionId: string) {
    return this.prisma.inscripcion.count({ where: { capacitacionId, estado: { in: ['PENDIENTE', 'EN_CURSO'] } } });
  }

  async crearModulo(capacitacionId: string, nombre: string, tipo: TipoModulo) {
    return this.prisma.$transaction(async (tx) => {
      const max = await tx.modulo.aggregate({ where: { capacitacionId }, _max: { orden: true } });
      return tx.modulo.create({ data: { capacitacionId, nombre, tipo, orden: (max._max.orden ?? 0) + 1 } });
    });
  }

  renombrarModulo(id: string, nombre: string) {
    return this.prisma.modulo.update({ where: { id }, data: { nombre } });
  }

  async eliminarModulo(id: string): Promise<string[]> {
    return this.prisma.$transaction(async (tx) => {
      const acts = await tx.actividad.findMany({ where: { moduloId: id, archivoKey: { not: null } }, select: { archivoKey: true } });
      await tx.modulo.delete({ where: { id } });
      return acts.map((a) => a.archivoKey!).filter(Boolean);
    });
  }

  /** Intercambia el orden con el vecino respetando UNIQUE(capacitacion_id, orden). */
  async moverModulo(id: string, capacitacionId: string, direccion: -1 | 1): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const hermanos = await tx.modulo.findMany({ where: { capacitacionId }, orderBy: { orden: 'asc' }, select: { id: true, orden: true } });
      const i = hermanos.findIndex((m) => m.id === id);
      const j = i + direccion;
      if (i < 0 || j < 0 || j >= hermanos.length) return;
      const a = hermanos[i]!;
      const b = hermanos[j]!;
      await tx.modulo.update({ where: { id: a.id }, data: { orden: -1 } });
      await tx.modulo.update({ where: { id: b.id }, data: { orden: a.orden } });
      await tx.modulo.update({ where: { id: a.id }, data: { orden: b.orden } });
    });
  }

  async crearActividad(data: { moduloId: string; titulo: string; tipo: TipoActividad; contenido: string | null; archivoKey: string | null }) {
    return this.prisma.$transaction(async (tx) => {
      const max = await tx.actividad.aggregate({ where: { moduloId: data.moduloId }, _max: { orden: true } });
      return tx.actividad.create({ data: { ...data, orden: (max._max.orden ?? 0) + 1 } });
    });
  }

  actualizarActividad(id: string, data: Prisma.ActividadUpdateInput) {
    return this.prisma.actividad.update({ where: { id }, data });
  }

  eliminarActividad(id: string) {
    return this.prisma.actividad.delete({ where: { id } });
  }

  pesoPreguntas(moduloId: string) {
    return this.prisma.pregunta.aggregate({ where: { moduloId }, _sum: { peso: true } });
  }

  crearPregunta(data: Prisma.PreguntaUncheckedCreateInput) {
    return this.prisma.pregunta.create({ data });
  }

  eliminarPregunta(id: string) {
    return this.prisma.pregunta.delete({ where: { id } });
  }

  /** Nº de preguntas de los módulos de CONTENIDO (las hereda el módulo TEST). */
  preguntasDeContenido(capacitacionId: string) {
    return this.prisma.pregunta.count({ where: { modulo: { capacitacionId, tipo: 'CONTENIDO' } } });
  }
}
