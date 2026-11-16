'use client';

import type { FiltrosResultados } from '@regicap/types';
import { Alert, Button, Card, EmptyState, MetricCard, SectionLabel, Skeleton } from '@regicap/ui';
import { ChevronRight, Download, FilterX, Inbox } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { colorPuntaje, NivelBadge } from '@/components/inscripciones/estado-inscripcion-badge';
import { Consulta, Cuadricula, PageHeader } from '@/components/page';
import { useToast } from '@/components/toast';
import { mensajeDe } from '@/lib/forms';
import { qs } from '@/lib/api-client';
import { useReencolarCalificaciones, useResultados } from '@/lib/queries';
import { BarraPuntaje, Donut } from './charts';
import { FiltrosResultadosBar } from './filtros-resultados';

/** CU-08 Consultar resultados (Administrador): dashboard con filtros, participantes y exportación. */
export function ConsultarResultadosPage() {
  const [filtros, setFiltros] = useState<FiltrosResultados>({});
  const query = useResultados(filtros);
  const router = useRouter();
  const reencolar = useReencolarCalificaciones();
  const { toast } = useToast();

  return (
    <>
      <PageHeader
        title="Consultar resultados"
        subtitle="Calificaciones de los participantes por capacitación y por módulo."
        actions={
          <Button variant="secondary" size="sm" onClick={() => { window.location.href = `/api/admin/resultados/exportar${qs(filtros)}`; }}>
            <Download className="size-3.5" aria-hidden /> Exportar reporte
          </Button>
        }
      />
      <FiltrosResultadosBar filtros={filtros} onChange={setFiltros} opciones={query.data?.opciones} />
      <Consulta query={query} esqueleto={<Cuadricula cols={4}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</Cuadricula>}>
        {(d) => {
          const hayFiltros = Object.keys(filtros).length > 0;
          if (!d.filas.length && !d.porCapacitacion.some((p) => p.puntaje !== null)) {
            return hayFiltros ? (
              <EmptyState icon={<FilterX className="size-7" />} title="Ningún resultado coincide con los filtros" description="Prueba con otros criterios o límpialos para ver todo." action={<Button variant="secondary" onClick={() => setFiltros({})}>Limpiar filtros</Button>} />
            ) : (
              <EmptyState className="border-danger/40" icon={<Inbox className="size-7" />} title="Aún no hay resultados procesados" description="Cuando los participantes envíen módulos y la IA los califique, los verás aquí." />
            );
          }
          return (
            <>
              {d.calificacionesConError > 0 && (
                <Alert tone="warning" className="mb-3" action={<Button size="sm" variant="secondary" loading={reencolar.isPending} onClick={() => reencolar.mutateAsync().then((r) => toast(`${r.reencoladas} calificación(es) reencoladas.`)).catch((e) => toast(mensajeDe(e), 'error'))}>Reintentar</Button>}>
                  {d.calificacionesConError} calificación{d.calificacionesConError === 1 ? '' : 'es'} no se pudieron procesar (el servicio de IA no respondió). Los participantes las ven como «Pendiente de calificación».
                </Alert>
              )}
              {d.calificacionesPendientes > 0 && <Alert tone="info" className="mb-3">{d.calificacionesPendientes} calificación{d.calificacionesPendientes === 1 ? '' : 'es'} en proceso; los números se actualizarán solos.</Alert>}

              <Cuadricula cols={4}>
                <MetricCard label="Participantes" value={d.metricas.participantes} hint="con inscripción vigente" />
                <MetricCard label="Puntaje promedio" value={d.metricas.puntajePromedio ?? '—'} hint="entre inscripciones calificadas" />
                <MetricCard label="Tasa de completitud" value={`${d.metricas.tasaCompletitud}%`} hint="inscripciones completadas" />
                <MetricCard label="Rendimiento alto" value={`${d.metricas.rendimientoAlto}%`} hint="≥ 80 pts" tone="success" />
              </Cuadricula>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <Card className="flex flex-col">
                  <SectionLabel>Puntaje por capacitación</SectionLabel>
                  <p className="mb-2.5 mt-0.5 text-[11px] text-fg-2">Haz clic en una capacitación para ver el detalle por módulo</p>
                  <div className="flex-1">
                    {d.porCapacitacion.length ? d.porCapacitacion.map((b) => (
                      <BarraPuntaje key={b.capacitacionId} etiqueta={b.nombre} valor={b.puntaje} detalle={`${b.participantes} participantes`} onClick={() => router.push(`/admin/resultados/capacitaciones/${b.capacitacionId}`)} />
                    )) : <p className="text-xs text-fg-2">Sin capacitaciones publicadas.</p>}
                  </div>
                  {d.capacitacionMasDebil && <Alert tone="warning" className="mt-3 text-xs">{d.capacitacionMasDebil.nombre} presenta el puntaje más bajo ({d.capacitacionMasDebil.puntaje}). Se recomienda revisar su contenido.</Alert>}
                </Card>
                <Card>
                  <SectionLabel className="mb-3">Distribución</SectionLabel>
                  <Donut dist={d.distribucion} />
                </Card>
                <Card className="min-w-0">
                  <SectionLabel>Participantes</SectionLabel>
                  <p className="mb-2 mt-0.5 text-[11px] text-fg-2">Haz clic para ver su análisis individual</p>
                  <ul className="-mx-1.5 max-h-[22rem] overflow-y-auto">
                    {d.filas.map((f) => (
                      <li key={f.inscripcionId}>
                        <Link href={`/admin/participantes/${f.participanteId}`} className="flex items-center gap-2.5 rounded-md px-1.5 py-2 hover:bg-bg-2">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-semibold text-fg">{f.participante}</span>
                            <span className="block truncate text-[11px] text-fg-2">{f.capacitacion}</span>
                          </span>
                          <span className={`text-sm font-bold ${colorPuntaje(f.puntaje)}`}>{f.puntaje ?? '—'}</span>
                          <NivelBadge nivel={f.nivel} />
                          <ChevronRight className="size-3.5 shrink-0 text-fg-3" aria-hidden />
                        </Link>
                      </li>
                    ))}
                    {!d.filas.length && <li className="px-1.5 py-3 text-xs text-fg-2">Sin participantes para estos filtros.</li>}
                  </ul>
                </Card>
              </div>
            </>
          );
        }}
      </Consulta>
    </>
  );
}

