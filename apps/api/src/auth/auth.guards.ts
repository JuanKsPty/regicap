import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { Rol } from '@regicap/types';
import { PUBLIC_KEY, ROLES_KEY, type UsuarioAuth } from '../common/decorators';
import { AppException } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';

export const COOKIE_TOKEN = 'regicap_token';

/**
 * Caché corta de «¿la cuenta existe y está activa?» para no consultar la BD en cada
 * petición. Desactivar/eliminar una cuenta la invalida al instante en este proceso y,
 * en cualquier caso, expira sola en unos segundos (reduce el compromiso de D-06).
 */
const TTL_SESION_MS = 15_000;
const cuentas = new Map<string, { activa: boolean; hasta: number }>();
export function invalidarSesion(usuarioId: string) {
  cuentas.delete(usuarioId);
}

interface JwtPayload {
  sub: string;
  rol: Rol;
  empresaId: string | null;
}

/**
 * Autenticación global (Fase 2 · tácticas de seguridad): lee el JWT de la
 * cookie httpOnly `regicap_token` y deja el usuario en `req.user`.
 * (Se acepta también `Authorization: Bearer` para clientes no-navegador.)
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()])) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: UsuarioAuth }>();
    const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined;
    const token: string | undefined = req.cookies?.[COOKIE_TOKEN] ?? bearer;
    if (!token) throw this.sinSesion();
    try {
      const p = await this.jwt.verifyAsync<JwtPayload>(token);
      if (!(await this.cuentaActiva(p.sub))) throw this.sinSesion();
      req.user = { id: p.sub, rol: p.rol, empresaId: p.empresaId ?? null };
      return true;
    } catch {
      throw this.sinSesion();
    }
  }

  private async cuentaActiva(id: string): Promise<boolean> {
    const hit = cuentas.get(id);
    if (hit && hit.hasta > Date.now()) return hit.activa;
    const u = await this.prisma.usuario.findUnique({ where: { id }, select: { activo: true } });
    const activa = !!u?.activo;
    cuentas.set(id, { activa, hasta: Date.now() + TTL_SESION_MS });
    return activa;
  }

  private sinSesion() {
    return new AppException(HttpStatus.UNAUTHORIZED, 'NO_AUTENTICADO', 'Inicia sesión para continuar.');
  }
}

/** Autorización por rol con el decorador @Roles() (EC-01). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Rol[] | undefined>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!roles?.length) return true;
    const user = ctx.switchToHttp().getRequest<Request & { user?: UsuarioAuth }>().user;
    if (user && roles.includes(user.rol)) return true;
    throw new AppException(HttpStatus.FORBIDDEN, 'ROL_NO_PERMITIDO', 'No tienes permiso para realizar esta acción.');
  }
}
