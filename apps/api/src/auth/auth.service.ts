import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, type Rol, PrismaClient } from '@regicap/db';
import type { AdministradorDto, CrearAdministradorInput, LoginInput, RegistroInput, UsuarioDto } from '@regicap/types';
import * as bcrypt from 'bcryptjs';
import { AppException, noEncontrado } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';

/** Costo bcrypt (RNF-01). */
export const BCRYPT_COST = 12;
// Hash de relleno para que el tiempo de respuesta no revele si el correo existe.
const HASH_RELLENO = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO5k0dQ7zQ6cQ1g1o7xv7mS8xTn3kYQ3S';

type UsuarioConEmpresa = Prisma.UsuarioGetPayload<{ include: { empresa: { select: { nombre: true } } } }>;

export function aUsuarioDto(u: UsuarioConEmpresa): UsuarioDto {
  // Los DTO de salida nunca incluyen passwordHash.
  return {
    id: u.id,
    email: u.email,
    nombre: u.nombre,
    rol: u.rol,
    empresaId: u.empresaId,
    empresaNombre: u.empresa?.nombre ?? null,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** CU-02 Registro: Participante o Empresa (que crea su organización). */
  async registrar(dto: RegistroInput): Promise<{ usuario: UsuarioDto; token: string }> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    try {
      const usuario = await this.prisma.$transaction(async (tx) => {
        if (await tx.usuario.findUnique({ where: { email: dto.email } })) {
          throw new AppException(HttpStatus.CONFLICT, 'EMAIL_DUPLICADO', 'Ya existe una cuenta con ese correo.', {
            email: 'Ya existe una cuenta con ese correo.',
          });
        }
        let empresaId: string | null = null;
        if (dto.rol === 'EMPRESA') {
          const nombre = dto.empresaNombre!.trim();
          const existe = await tx.empresa.findFirst({ where: { nombre: { equals: nombre, mode: 'insensitive' } } });
          if (existe) {
            throw new AppException(HttpStatus.CONFLICT, 'EMPRESA_DUPLICADA', 'Ya existe una empresa con ese nombre.', {
              empresaNombre: 'Ya existe una empresa con ese nombre.',
            });
          }
          empresaId = (await tx.empresa.create({ data: { nombre, tipo: dto.empresaTipo ?? 'otro' } })).id;
        }
        return tx.usuario.create({
          data: { email: dto.email, passwordHash, nombre: dto.nombre, rol: dto.rol as Rol, empresaId },
          include: { empresa: { select: { nombre: true } } },
        });
      });
      return { usuario: aUsuarioDto(usuario), token: await this.firmar(usuario) };
    } catch (e) {
      // Carrera entre dos registros simultáneos con el mismo correo / empresa.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const campo = String(e.meta?.target ?? '').includes('nombre') ? 'empresaNombre' : 'email';
        throw new AppException(
          HttpStatus.CONFLICT,
          campo === 'email' ? 'EMAIL_DUPLICADO' : 'EMPRESA_DUPLICADA',
          campo === 'email' ? 'Ya existe una cuenta con ese correo.' : 'Ya existe una empresa con ese nombre.',
          { [campo]: campo === 'email' ? 'Ya existe una cuenta con ese correo.' : 'Ya existe una empresa con ese nombre.' },
        );
      }
      throw e;
    }
  }

  /** CU-01 Iniciar sesión. */
  async login(dto: LoginInput): Promise<{ usuario: UsuarioDto; token: string }> {
    const u = await this.prisma.usuario.findUnique({ where: { email: dto.email }, include: { empresa: { select: { nombre: true } } } });
    const ok = await bcrypt.compare(dto.password, u?.passwordHash ?? HASH_RELLENO);
    if (!u || !ok) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.');
    }
    return { usuario: aUsuarioDto(u), token: await this.firmar(u) };
  }

  async perfil(id: string): Promise<UsuarioDto> {
    const u = await this.prisma.usuario.findUnique({ where: { id }, include: { empresa: { select: { nombre: true } } } });
    if (!u) throw new AppException(HttpStatus.UNAUTHORIZED, 'NO_AUTENTICADO', 'Inicia sesión para continuar.');
    return aUsuarioDto(u);
  }

  /** La Empresa da de alta a un Administrador de SU organización (empresaId del token). */
  async crearAdministrador(empresaId: string, dto: CrearAdministradorInput): Promise<AdministradorDto> {
    if (await this.prisma.usuario.findUnique({ where: { email: dto.email } })) {
      throw new AppException(HttpStatus.CONFLICT, 'EMAIL_DUPLICADO', 'Ya existe una cuenta con ese correo.', {
        email: 'Ya existe una cuenta con ese correo.',
      });
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    const u = await this.prisma.usuario.create({
      data: { email: dto.email, passwordHash, nombre: dto.nombre, rol: 'ADMINISTRADOR', empresaId },
    });
    return { id: u.id, nombre: u.nombre, email: u.email };
  }

  async listarAdministradores(empresaId: string): Promise<AdministradorDto[]> {
    const lista = await this.prisma.usuario.findMany({
      where: { empresaId, rol: 'ADMINISTRADOR' },
      orderBy: { creadoEn: 'asc' },
      select: { id: true, nombre: true, email: true },
    });
    return lista;
  }

  async eliminarAdministrador(empresaId: string, id: string): Promise<void> {
    const u = await this.prisma.usuario.findFirst({ where: { id, empresaId, rol: 'ADMINISTRADOR' } });
    if (!u) throw noEncontrado();
    const feedbacks = await this.prisma.feedback.count({ where: { administradorId: id } });
    if (feedbacks > 0) {
      throw new AppException(HttpStatus.CONFLICT, 'DATOS_INVALIDOS', 'Este administrador ya entregó feedback y no puede eliminarse.');
    }
    await this.prisma.usuario.delete({ where: { id } });
  }

  private firmar(u: { id: string; rol: Rol; empresaId: string | null }): Promise<string> {
    return this.jwt.signAsync({ sub: u.id, rol: u.rol, empresaId: u.empresaId });
  }
}

export type { PrismaClient };
