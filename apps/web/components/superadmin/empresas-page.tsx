'use client';

import { Card, EmptyState, Skeleton } from '@regicap/ui';
import { Building2 } from 'lucide-react';
import { Consulta, PageHeader } from '@/components/page';
import { useEmpresasGestion } from '@/lib/queries';

/** Empresas registradas con su nº de cuentas y de capacitaciones. */
export function EmpresasPage() {
  const query = useEmpresasGestion();
  return (
    <>
      <PageHeader title="Empresas" subtitle="Organizaciones registradas en la plataforma. Para sumarles cuentas usa «Nuevo usuario» en Usuarios." />
      <Consulta query={query} esqueleto={<Skeleton className="h-48" />}>
        {(lista) =>
          lista.length ? (
            <Card className="overflow-hidden p-0">
              <ul>
                {lista.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border-subtle px-4 py-3.5 last:border-0">
                    <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-light text-primary"><Building2 className="size-4" /></span>
                    <div className="min-w-[10rem] flex-1">
                      <div className="text-[13px] font-semibold">{e.nombre}</div>
                      <div className="text-xs capitalize text-fg-2">{e.tipo} · desde {new Date(e.creadoEn).toLocaleDateString('es')}</div>
                    </div>
                    <div className="flex gap-5 text-xs text-fg-2">
                      <span><strong className="text-sm text-fg">{e.usuarios}</strong> cuenta{e.usuarios === 1 ? '' : 's'}</span>
                      <span><strong className="text-sm text-fg">{e.capacitaciones}</strong> capacitaci{e.capacitaciones === 1 ? 'ón' : 'ones'}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <EmptyState icon={<Building2 className="size-7" />} title="Aún no hay empresas" />
          )
        }
      </Consulta>
    </>
  );
}
