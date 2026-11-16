import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Rol } from '@regicap/types';
import type { Request } from 'express';

/** Usuario autenticado, tomado SIEMPRE del token (nunca del cuerpo — D-07). */
export interface UsuarioAuth {
  id: string;
  rol: Rol;
  empresaId: string | null;
}

export const ROLES_KEY = 'roles';
export const PUBLIC_KEY = 'public';

/** Restringe el endpoint a uno o más roles (RolesGuard). */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
/** Endpoint sin autenticación (login, registro, salud). */
export const Public = () => SetMetadata(PUBLIC_KEY, true);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): UsuarioAuth => {
  return ctx.switchToHttp().getRequest<Request & { user: UsuarioAuth }>().user;
});

/** empresaId del token; las rutas de Empresa/Administrador siempre lo tienen. */
export function empresaDe(user: UsuarioAuth): string {
  if (!user.empresaId) throw new Error('La cuenta no pertenece a una Empresa.');
  return user.empresaId;
}
