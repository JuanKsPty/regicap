import type { Rol } from '@regicap/types';

export const HOME_POR_ROL: Record<Rol, string> = {
  PARTICIPANTE: '/participante/capacitaciones',
  EMPRESA: '/empresa/capacitaciones',
  ADMINISTRADOR: '/admin/resultados',
};

/** Solo se acepta una ruta interna para `next` (evita redirecciones abiertas). */
export function destinoSeguro(next: string | null, rol: Rol): string {
  const permitido = { PARTICIPANTE: '/participante', EMPRESA: '/empresa', ADMINISTRADOR: '/admin' }[rol];
  return next && next.startsWith(permitido) && !next.startsWith('//') ? next : HOME_POR_ROL[rol];
}
