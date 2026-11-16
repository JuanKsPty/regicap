import { HttpStatus, Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import type { Rol } from '@regicap/db';
import type { CrearUsuarioInput, EmpresaGestionDto, FiltroUsuarios, UsuarioGestionDto } from '@regicap/types';
import * as bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '../auth/auth.service';
import { invalidarSesion } from '../auth/auth.guards';
import { AppException, noEncontrado, reglaViolada } from '../common/errors';
import { ENV, type Env } from '../config/env';
import { SuperadminRepository } from './superadmin.repository';

type Fila = NonNullable<Awaited<ReturnType<SuperadminRepository['findUsuario']>>>;

const aDto = (u: Fila): UsuarioGestionDto => ({
  id: u.id,
  nombre: u.nombre,
  email: u.email,
  rol: u.rol,
  activo: u.activo,
  empresaId: u.empresaId,
  empresaNombre: u.empresa?.nombre ?? null,
  creadoEn: u.creadoEn.toISOString(),
});

const noPermitida = (mensaje: string) => new AppException(HttpStatus.CONFLICT, 'OPERACION_NO_PERMITIDA', mensaje);

/**
 * Gestión de cuentas. El Superadministrador no pertenece a ninguna Empresa y NO tiene
 * acceso a capacitaciones, respuestas ni resultados: solo administra cuentas y empresas.
 */
@Injectable()
export class SuperadminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SuperadminService.name);

  constructor(
    private readonly repo: SuperadminRepository,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Crea el primer superadmin desde SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD si no existe (no pisa su contraseña). */
  async onApplicationBootstrap() {
    const cfg = this.env.superadmin;
    if (!cfg) return;
    try {
      const existe = await this.repo.findPorEmail(cfg.email);
      if (existe) {
        if (existe.rol !== 'SUPERADMIN') this.logger.warn(`SUPERADMIN_EMAIL (${cfg.email}) ya pertenece a una cuenta con otro rol: no se modifica.`);
        return;
      }
      await this.repo.crear({ email: cfg.email, passwordHash: await bcrypt.hash(cfg.password, BCRYPT_COST), nombre: cfg.nombre, rol: 'SUPERADMIN' });
      this.logger.log(`Superadministrador creado: ${cfg.email}`);
    } catch (e) {
      this.logger.error(`No se pudo crear el superadministrador: ${(e as Error).message}`);
    }
  }

  async usuarios(f: FiltroUsuarios): Promise<UsuarioGestionDto[]> {
    return (await this.repo.usuarios(f.q || undefined, f.rol as Rol | undefined)).map(aDto);
  }

  async empresas(): Promise<EmpresaGestionDto[]> {
    return (await this.repo.empresas()).map((e) => ({
      id: e.id,
      nombre: e.nombre,
      tipo: e.tipo,
      creadoEn: e.creadoEn.toISOString(),
      usuarios: e._count.usuarios,
      capacitaciones: e._count.capacitaciones,
    }));
  }

  async crear(dto: CrearUsuarioInput): Promise<UsuarioGestionDto> {
    if (await this.repo.findPorEmail(dto.email)) {
      throw new AppException(HttpStatus.CONFLICT, 'EMAIL_DUPLICADO', 'Ya existe una cuenta con ese correo.', { email: 'Ya existe una cuenta con ese correo.' });
    }
    let empresaId: string | undefined;
    let empresaNueva: { nombre: string; tipo: string } | undefined;

    if (dto.rol === 'ADMINISTRADOR' || (dto.rol === 'EMPRESA' && dto.empresaId)) {
      if (!(await this.repo.findEmpresa(dto.empresaId!))) {
        throw new AppException(HttpStatus.NOT_FOUND, 'NO_ENCONTRADO', 'No se encontró la empresa.', { empresaId: 'No se encontró la empresa.' });
      }
      empresaId = dto.empresaId;
    } else if (dto.rol === 'EMPRESA') {
      const nombre = dto.empresaNombre!.trim();
      if (await this.repo.findEmpresaPorNombre(nombre)) {
        throw new AppException(HttpStatus.CONFLICT, 'EMPRESA_DUPLICADA', 'Ya existe una empresa con ese nombre.', { empresaNombre: 'Ya existe una empresa con ese nombre.' });
      }
      empresaNueva = { nombre, tipo: dto.empresaTipo ?? 'otro' };
    }
    const u = await this.repo.crear({
      email: dto.email,
      passwordHash: await bcrypt.hash(dto.password, BCRYPT_COST),
      nombre: dto.nombre,
      rol: dto.rol as Rol,
      empresaId,
      empresaNueva,
    });
    return aDto(u);
  }

  async actualizar(actorId: string, id: string, cambios: { nombre?: string; activo?: boolean }): Promise<UsuarioGestionDto> {
    const u = await this.obtener(id);
    if (cambios.activo === false) {
      if (id === actorId) throw noPermitida('No puedes desactivar tu propia cuenta.');
      if (u.rol === 'SUPERADMIN' && u.activo && (await this.repo.superadminsActivos(id)) === 0) {
        throw noPermitida('Debe quedar al menos un superadministrador activo.');
      }
    }
    const nuevo = await this.repo.actualizar(id, { ...(cambios.nombre !== undefined ? { nombre: cambios.nombre } : {}), ...(cambios.activo !== undefined ? { activo: cambios.activo } : {}) });
    invalidarSesion(id);
    return aDto(nuevo);
  }

  async cambiarPassword(id: string, password: string): Promise<void> {
    await this.obtener(id);
    await this.repo.actualizar(id, { passwordHash: await bcrypt.hash(password, BCRYPT_COST) });
  }

  async eliminar(actorId: string, id: string): Promise<void> {
    const u = await this.obtener(id);
    if (id === actorId) throw noPermitida('No puedes eliminar tu propia cuenta.');
    if (u.rol === 'SUPERADMIN' && u.activo && (await this.repo.superadminsActivos(id)) === 0) {
      throw noPermitida('Debe quedar al menos un superadministrador activo.');
    }
    if (u.rol === 'ADMINISTRADOR' && (await this.repo.feedbacksEscritos(id)) > 0) {
      throw reglaViolada('OPERACION_NO_PERMITIDA', 'Este administrador ya entregó feedback y no puede eliminarse; desactívalo en su lugar.');
    }
    if (u.rol === 'PARTICIPANTE') await this.repo.eliminarParticipante(id);
    else await this.repo.eliminar(id);
    invalidarSesion(id);
  }

  private async obtener(id: string): Promise<Fila> {
    const u = await this.repo.findUsuario(id);
    if (!u) throw noEncontrado('No se encontró la cuenta.');
    return u;
  }
}
