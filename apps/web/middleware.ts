import { jwtVerify } from 'jose';
import { NextResponse, type NextRequest } from 'next/server';
import type { Rol } from '@regicap/types';

/**
 * middleware.ts (Fase 2 §3.2): redirige a /login sin sesión y al portal del rol
 * si se intenta abrir otro. Es solo comodidad de navegación: la autoridad final
 * es SIEMPRE la API (JwtAuthGuard + RolesGuard → 403).
 */
const HOME: Record<Rol, string> = {
  PARTICIPANTE: '/participante/capacitaciones',
  EMPRESA: '/empresa/capacitaciones',
  ADMINISTRADOR: '/admin/resultados',
  SUPERADMIN: '/superadmin/usuarios',
};
const PREFIJO: Record<string, Rol> = { '/participante': 'PARTICIPANTE', '/empresa': 'EMPRESA', '/admin': 'ADMINISTRADOR', '/superadmin': 'SUPERADMIN' };

async function rolDe(req: NextRequest): Promise<Rol | null> {
  const token = req.cookies.get('regicap_token')?.value;
  const secreto = process.env.JWT_SECRET;
  if (!token || !secreto) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secreto));
    return (payload.rol as Rol) ?? null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const rol = await rolDe(req);
  const redirigir = (ruta: string, extra?: Record<string, string>) => {
    const url = req.nextUrl.clone();
    url.pathname = ruta;
    url.search = '';
    for (const [k, v] of Object.entries(extra ?? {})) url.searchParams.set(k, v);
    return NextResponse.redirect(url);
  };

  if (pathname === '/') return redirigir(rol ? HOME[rol] : '/login');
  if (pathname === '/login' || pathname === '/registro') return rol ? redirigir(HOME[rol]) : NextResponse.next();

  const portal = Object.keys(PREFIJO).find((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (portal) {
    if (!rol) return redirigir('/login', { next: pathname });
    if (PREFIJO[portal] !== rol) return redirigir(HOME[rol]);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.svg|.*\\..*).*)'],
};
