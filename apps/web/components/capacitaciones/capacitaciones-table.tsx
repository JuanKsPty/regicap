'use client';

import type { CapacitacionDto } from '@regicap/types';
import { Button, Card, EmptyState } from '@regicap/ui';
import { GraduationCap, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useToast } from '@/components/toast';
import { mensajeDe } from '@/lib/forms';
import { useCambiarEstadoCapacitacion } from '@/lib/queries';
import { ConfirmarEliminarDialog } from './confirmar-eliminar-dialog';
import { EstadoBadge } from './estado-badge';

const COLS = 'md:grid md:grid-cols-[minmax(0,1fr)_110px_80px_110px_auto] md:items-center md:gap-4';

/** Tabla «Mis capacitaciones registradas» (en móvil se apila como tarjetas, sin scroll horizontal). */
export function CapacitacionesTable({ capacitaciones }: { capacitaciones: CapacitacionDto[] }) {
  const estado = useCambiarEstadoCapacitacion();
  const { toast } = useToast();
  const [porEliminar, setPorEliminar] = useState<CapacitacionDto | null>(null);

  async function cambiar(c: CapacitacionDto, accion: 'publicar' | 'despublicar') {
    try {
      await estado.mutateAsync({ id: c.id, accion });
      toast(accion === 'publicar' ? `«${c.nombre}» ya aparece en el catálogo.` : `«${c.nombre}» volvió a Borrador.`);
    } catch (e) {
      toast(mensajeDe(e), 'error');
    }
  }

  if (!capacitaciones.length) {
    return <EmptyState icon={<GraduationCap className="size-7" />} title="Aún no has registrado capacitaciones" description="Usa el formulario de arriba para crear la primera. Quedará en Borrador hasta que la publiques." />;
  }

  return (
    <>
      <Card className="overflow-hidden p-0">
        <div className={`hidden border-b border-border bg-bg-2/60 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.5px] text-fg-2 ${COLS} md:grid`}>
          <span>Nombre</span>
          <span>Duración</span>
          <span>Módulos</span>
          <span>Estado</span>
          <span className="text-right">Acciones</span>
        </div>
        <ul>
          {capacitaciones.map((c) => (
            <li key={c.id} className={`flex flex-col gap-2.5 border-b border-border-subtle px-4 py-3.5 last:border-0 ${COLS}`}>
              <div className="flex items-start justify-between gap-2 md:block">
                <Link href={`/empresa/capacitaciones/${c.id}`} className="min-w-0 text-[13px] font-semibold text-fg hover:text-primary hover:underline">
                  {c.nombre}
                </Link>
                <span className="md:hidden">
                  <EstadoBadge estado={c.estado} />
                </span>
              </div>
              <div className="flex gap-3 text-xs text-fg-2 md:contents">
                <span>{c.duracion}</span>
                <span>
                  {c.modulos} <span className="md:hidden">módulos</span>
                </span>
              </div>
              <div className="hidden md:block">
                <EstadoBadge estado={c.estado} />
              </div>
              <div className="flex flex-wrap gap-1.5 md:justify-end">
                <Button size="sm" variant="secondary" asChild>
                  <Link href={`/empresa/capacitaciones/${c.id}`}>
                    <Pencil className="size-3.5" aria-hidden /> Editar
                  </Link>
                </Button>
                {c.estado === 'PUBLICADA' ? (
                  <Button size="sm" variant="secondary" onClick={() => cambiar(c, 'despublicar')} disabled={estado.isPending}>
                    Despublicar
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => cambiar(c, 'publicar')} disabled={estado.isPending}>
                    Publicar
                  </Button>
                )}
                <Button size="sm" variant="danger" onClick={() => setPorEliminar(c)} aria-label={`Eliminar ${c.nombre}`}>
                  <Trash2 className="size-3.5" aria-hidden /> Eliminar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <ConfirmarEliminarDialog capacitacion={porEliminar} onClose={() => setPorEliminar(null)} />
    </>
  );
}
