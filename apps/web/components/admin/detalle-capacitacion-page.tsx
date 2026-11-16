'use client';

import { Card, SectionLabel, Skeleton } from '@regicap/ui';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { colorPuntaje, EstadoInscripcionBadge } from '@/components/inscripciones/estado-inscripcion-badge';
import { Consulta, PageHeader } from '@/components/page';
import { useDetalleCapacitacionAdmin } from '@/lib/queries';
import { BarraPuntaje } from './charts';

/** CU-08: detalle de una capacitación (puntaje por módulo y participantes). */
export function DetalleCapacitacionPage({ id }: { id: string }) {
  const query = useDetalleCapacitacionAdmin(id);
  return (
    <Consulta query={query} esqueleto={<Skeleton className="h-64" />}>
      {(d) => (
        <>
          <PageHeader back={{ href: '/admin/resultados', label: 'Volver a resultados' }} title={d.nombre} subtitle={d.empresa} />
          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <SectionLabel className="mb-3">Puntaje por módulo</SectionLabel>
              {d.modulos.length ? d.modulos.map((m) => <BarraPuntaje key={m.moduloId} etiqueta={`M${m.orden} · ${m.nombre}`} valor={m.puntaje} detalle={`${m.respuestas} respuestas`} />) : <p className="text-xs text-fg-2">Esta capacitación aún no tiene módulos.</p>}
            </Card>
            <Card>
              <SectionLabel>Participantes de esta capacitación</SectionLabel>
              <p className="mb-2 mt-0.5 text-[11px] text-fg-2">Haz clic para ver su análisis</p>
              <ul className="-mx-1.5">
                {d.participantes.map((f) => (
                  <li key={f.inscripcionId}>
                    <Link href={`/admin/participantes/${f.participanteId}`} className="flex items-center gap-2.5 rounded-md px-1.5 py-2 hover:bg-bg-2">
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{f.participante}</span>
                      <span className={`text-sm font-bold ${colorPuntaje(f.puntaje)}`}>{f.puntaje ?? '—'}</span>
                      <EstadoInscripcionBadge estado={f.estado} />
                      <ChevronRight className="size-3.5 text-fg-3" aria-hidden />
                    </Link>
                  </li>
                ))}
                {!d.participantes.length && <li className="px-1.5 py-3 text-xs text-fg-2">Aún no hay participantes inscritos.</li>}
              </ul>
            </Card>
          </div>
        </>
      )}
    </Consulta>
  );
}

