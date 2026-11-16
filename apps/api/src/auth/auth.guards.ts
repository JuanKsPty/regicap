import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { Rol } from '@regicap/types';
import { PUBLIC_KEY, ROLES_KEY, type UsuarioAuth } from '../common/decorators';
import { AppException } from '../common/errors';

export const COOKIE_TOKEN = 'regicap_token';

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
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()])) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: UsuarioAuth }>();
    const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined;
    const token: string | undefined = req.cookies?.[COOKIE_TOKEN] ?? bearer;
    if (!token) throw this.sinSesion();
    try {
      const p = await this.jwt.verifyAsync<JwtPayload>(token);
      req.user = { id: p.sub, rol: p.rol, empresaId: p.empresaId ?? null };
      return true;
    } catch {
      throw this.sinSesion();
    }
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
