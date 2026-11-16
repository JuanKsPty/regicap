'use client';

import { useQueryClient } from '@tanstack/react-query';
import { BarChart3, BookOpen, GraduationCap, LogOut, Menu, MessageSquare, PlayCircle, Sparkles, Users, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Rol } from '@regicap/types';
import { cn } from '@regicap/ui';
import { api, ApiError } from '@/lib/api-client';
import { useMe } from '@/lib/queries';

type Icono = React.ComponentType<{ className?: string }>;
interface Item {
  href: string;
  label: string;
  icon: Icono;
}
interface Grupo {
  titulo: string;
  items: Item[];
}

const MENUS: Record<Rol, Grupo[]> = {
  PARTICIPANTE: [
    {
      titulo: 'Principal',
      items: [
        { href: '/participante/capacitaciones', label: 'Administrar capacitaciones', icon: BookOpen },
        { href: '/participante/tomar', label: 'Tomar capacitaciones', icon: PlayCircle },
        { href: '/participante/feedback', label: 'Revisar feedback', icon: MessageSquare },
      ],
    },
  ],
  EMPRESA: [
    { titulo: 'Principal', items: [{ href: '/empresa/capacitaciones', label: 'Gestionar capacitaciones', icon: GraduationCap }] },
    { titulo: 'Organización', items: [{ href: '/empresa/administradores', label: 'Administradores', icon: Users }] },
  ],
  ADMINISTRADOR: [
    {
      titulo: 'Resultados',
      items: [
        { href: '/admin/resultados', label: 'Consultar resultados', icon: BarChart3 },
        { href: '/admin/analisis', label: 'Analizar resultados', icon: Sparkles },
      ],
    },
    { titulo: 'Gestión', items: [{ href: '/admin/feedback', label: 'Entregar feedback', icon: MessageSquare }] },
  ],
};

const ROL_ETIQUETA: Record<Rol, string> = { PARTICIPANTE: 'Participante', EMPRESA: 'Empresa', ADMINISTRADOR: 'Administrador' };
// Color de rol: tiñe el ítem activo y el avatar (docs/context.md §3)
const ROL_COLOR: Record<Rol, { activo: string; avatar: string }> = {
  PARTICIPANTE: { activo: 'bg-rol-participante/20 text-white border-l-rol-participante', avatar: 'bg-rol-participante' },
  EMPRESA: { activo: 'bg-rol-empresa/25 text-white border-l-rol-empresa', avatar: 'bg-rol-empresa' },
  ADMINISTRADOR: { activo: 'bg-rol-admin/30 text-white border-l-rol-admin', avatar: 'bg-rol-admin' },
};

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="grid size-7 place-items-center rounded-lg bg-primary text-[13px] font-extrabold text-white">R</span>
      <span className="text-[15px] font-extrabold tracking-wide text-white">REGICAP</span>
    </div>
  );
}

function Navegacion({ rol, onNavigate }: { rol: Rol; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" className="flex-1 overflow-y-auto px-2 pb-4">
      {MENUS[rol].map((g) => (
        <div key={g.titulo} className="mt-4">
          <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.5px] text-[#8BA3CC]">{g.titulo}</div>
          {g.items.map((it) => {
            const activo = pathname === it.href || pathname.startsWith(`${it.href}/`);
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={onNavigate}
                aria-current={activo ? 'page' : undefined}
                className={cn(
                  'mb-0.5 flex items-center gap-2.5 rounded-lg border-l-[3px] border-l-transparent px-3 py-2.5 text-[13px] font-medium text-[#C3D0EA] transition-colors hover:bg-white/10 hover:text-white',
                  activo && ROL_COLOR[rol].activo,
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {it.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function AppShell({ rol, children }: { rol: Rol; children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me, error: errorMe } = useMe();

  useEffect(() => setAbierto(false), [pathname]);

  // Token válido pero cuenta inexistente (p. ej. eliminada): se limpia la cookie y se vuelve al login
  useEffect(() => {
    if (errorMe instanceof ApiError && errorMe.status === 401) {
      void api('/auth/logout', { method: 'POST' }).catch(() => undefined).finally(() => window.location.assign('/login'));
    }
  }, [errorMe]);

  async function salir() {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    qc.clear();
    router.replace('/login');
    router.refresh();
  }

  const inicial = (me?.nombre ?? ROL_ETIQUETA[rol]).trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[200px_minmax(0,1fr)]">
      {/* Sidebar de escritorio */}
      <aside className="sticky top-0 hidden h-dvh flex-col bg-navy lg:flex">
        <div className="px-4 pb-1 pt-5">
          <Logo />
          <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.5px] text-[#8BA3CC]">{ROL_ETIQUETA[rol]}</div>
        </div>
        <Navegacion rol={rol} />
        <div className="border-t border-white/10 p-3">
          <button onClick={salir} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#C3D0EA] hover:bg-white/10 hover:text-white">
            <LogOut className="size-4" aria-hidden /> Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Barra superior */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-4 lg:px-5">
          <button aria-label="Abrir menú" aria-expanded={abierto} onClick={() => setAbierto(true)} className="-ml-1 grid size-10 place-items-center rounded-lg text-fg hover:bg-bg-2 lg:hidden">
            <Menu className="size-5" />
          </button>
          <span className="text-[15px] font-extrabold tracking-wide text-navy lg:hidden">REGICAP</span>
          <div className="ml-auto flex min-w-0 items-center gap-3">
            <div className="hidden min-w-0 text-right sm:block">
              <div className="truncate text-[13px] font-semibold leading-tight text-fg">{me?.nombre ?? '…'}</div>
              <div className="truncate text-[11px] leading-tight text-fg-2">{me?.empresaNombre ?? ROL_ETIQUETA[rol]}</div>
            </div>
            <span aria-hidden className={cn('grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white', ROL_COLOR[rol].avatar)}>
              {inicial}
            </span>
          </div>
        </header>

        <main id="contenido" className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-5 sm:px-5 lg:py-6">
          {children}
        </main>
      </div>

      {/* Drawer móvil */}
      {abierto && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button aria-label="Cerrar menú" className="absolute inset-0 bg-navy/60" onClick={() => setAbierto(false)} />
          <div className="rise absolute inset-y-0 left-0 flex w-[260px] max-w-[85vw] flex-col bg-navy shadow-pop">
            <div className="flex items-center justify-between px-4 pb-1 pt-4">
              <div>
                <Logo />
                <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.5px] text-[#8BA3CC]">{ROL_ETIQUETA[rol]}</div>
              </div>
              <button aria-label="Cerrar menú" onClick={() => setAbierto(false)} className="grid size-9 place-items-center rounded-lg text-[#C3D0EA] hover:bg-white/10">
                <X className="size-5" />
              </button>
            </div>
            <Navegacion rol={rol} onNavigate={() => setAbierto(false)} />
            <div className="border-t border-white/10 p-3">
              <div className="px-3 pb-2 text-[12px] text-[#C3D0EA]">{me?.nombre}</div>
              <button onClick={salir} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#C3D0EA] hover:bg-white/10 hover:text-white">
                <LogOut className="size-4" aria-hidden /> Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


