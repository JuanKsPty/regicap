import { Injectable } from '@nestjs/common';
import type { Prisma, Rol } from '@regicap/db';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuperadminRepository {
  constructor(private readonly prisma: PrismaService) {}

  usuarios(q?: string, rol?: Rol) {
    const where: Prisma.UsuarioWhereInput = {
      ...(rol ? { rol } : {}),
      ...(q
        ? { OR: [{ nombre: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, { empresa: { nombre: { contains: q, mode: 'insensitive' } } }] }
        : {}),
    };
    return this.prisma.usuario.findMany({
      where,
      orderBy: [{ rol: 'asc' }, { nombre: 'asc' }],
      take: 500,
      include: { empresa: { select: { nombre: true } } },
    });
  }

  empresas() {
    return this.prisma.empresa.findMany({
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { usuarios: true, capacitaciones: true } } },
    });
  }

  findUsuario(id: string) {
    return this.prisma.usuario.findUnique({ where: { id }, include: { empresa: { select: { nombre: true } } } });
  }

  findPorEmail(email: string) {
    return this.prisma.usuario.findUnique({ where: { email } });
  }

  findEmpresa(id: string) {
    return this.prisma.empresa.findUnique({ where: { id } });
  }

  findEmpresaPorNombre(nombre: string) {
    return this.prisma.empresa.findFirst({ where: { nombre: { equals: nombre, mode: 'insensitive' } } });
  }

  /** Crea (opcionalmente) la Empresa y la cuenta en una transacción. */
  crear(data: { email: string; passwordHash: string; nombre: string; rol: Rol; empresaId?: string; empresaNueva?: { nombre: string; tipo: string } }) {
    return this.prisma.$transaction(async (tx) => {
      const empresaId = data.empresaNueva ? (await tx.empresa.create({ data: data.empresaNueva })).id : (data.empresaId ?? null);
      return tx.usuario.create({
        data: { email: data.email, passwordHash: data.passwordHash, nombre: data.nombre, rol: data.rol, empresaId },
        include: { empresa: { select: { nombre: true } } },
      });
    });
  }

  actualizar(id: string, data: Prisma.UsuarioUpdateInput) {
    return this.prisma.usuario.update({ where: { id }, data, include: { empresa: { select: { nombre: true } } } });
  }

  superadminsActivos(excluirId?: string) {
    return this.prisma.usuario.count({ where: { rol: 'SUPERADMIN', activo: true, ...(excluirId ? { id: { not: excluirId } } : {}) } });
  }

  feedbacksEscritos(administradorId: string) {
    return this.prisma.feedback.count({ where: { administradorId } });
  }

  /**
   * Elimina un Participante con todo lo suyo en UNA transacción (RNF-10):
   * feedback recibido e inscripciones (cascada → respuestas y calificaciones).
   */
  eliminarParticipante(id: string) {
    return this.prisma.$transaction([
      this.prisma.feedback.deleteMany({ where: { participanteId: id } }),
      this.prisma.inscripcion.deleteMany({ where: { participanteId: id } }),
      this.prisma.usuario.delete({ where: { id } }),
    ]);
  }

  eliminar(id: string) {
    return this.prisma.usuario.delete({ where: { id } });
  }
}
