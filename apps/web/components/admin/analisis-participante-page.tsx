'use client';

import { Alert, Button, Card, MetricCard, Skeleton } from '@regicap/ui';
import Link from 'next/link';
import { colorPuntaje, EstadoInscripcionBadge, NivelBadge } from '@/components/inscripciones/estado-inscripcion-badge';
import { Consulta, Cuadricula, PageHeader, Section } from '@/components/page';
import { useAnalisisParticipante } from '@/lib/queries';
import { BarraPuntaje } from './charts';

/** CU-08/CU-09: análisis individual de un participante (calculado en vivo desde sus respuestas calificadas). */
export function AnalisisParticipantePage({ id }: { id: string }) {
  const query = useAnalisisParticipante(id);
  return (
    <Consulta query={query} esqueleto={<Skeleton className="h-64" />}>
      {(p) => {
        const recom =
          p.nivel === 'BAJO' ? { tone: 'warning' as const, txt: `${p.nombre} presenta rendimiento bajo (${p.promedio} pts). Se recomienda feedback prioritario y refuerzo de contenidos.` }
          : p.nivel === 'MEDIO' ? { tone: 'info' as const, txt: `${p.nombre} tiene rendimiento medio (${p.promedio} pts). Un feedback focalizado puede llevarlo a nivel alto.` }
          : p.nivel === 'ALTO' ? { tone: 'success' as const, txt: `${p.nombre} mantiene rendimiento alto (${p.promedio} pts). Buen candidato para reconocimiento.` }
          : { tone: 'info' as const, txt: `${p.nombre} aún no tiene respuestas calificadas por la IA. No hay datos suficientes para el análisis.` };
        const primera = p.porCapacitacion[0]?.capacitacionId;
        return (
          <>
            <PageHeader back={{ href: '/admin/resultados', label: 'Volver a Consultar' }} title={<span className="flex flex-wrap items-center gap-2">{p.nombre} <NivelBadge nivel={p.nivel} /></span>} subtitle={p.email} />
            <Cuadricula cols={3}>
              <MetricCard label="Promedio global" value={p.promedio ?? '—'} hint="entre sus capacitaciones" />
              <MetricCard label="Inscripciones" value={p.inscripciones} hint="vigentes" />
              <MetricCard label="Completadas" value={p.completadas} hint="finalizadas" />
            </Cuadricula>
            <Section title="Desglose por capacitación y módulo">
              <div className="space-y-3">
                {p.porCapacitacion.map((c) => (
                  <Card key={c.capacitacionId}>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2"><span className="text-[13px] font-bold">{c.nombre}</span><EstadoInscripcionBadge estado={c.estado} /></div>
                      <span className={`text-sm font-bold ${colorPuntaje(c.puntaje)}`}>{c.puntaje !== null ? `${c.puntaje} pts` : 'Sin calificar'}</span>
                    </div>
                    {c.modulos.map((m) => (
                      <div key={m.moduloId} className="mb-2.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="min-w-0 truncate font-medium">M{m.orden} · {m.nombre}</span>
                          <span className={`shrink-0 font-bold ${colorPuntaje(m.puntaje)}`}>{m.puntaje !== null ? `${m.puntaje} pts` : m.pendienteCalificacion ? 'Pendiente de calificación' : 'Sin enviar'}</span>
                        </div>
                        <BarraPuntaje etiqueta="" valor={m.puntaje} />
                        {m.criterioMasBajo && <p className="-mt-0.5 text-[11px] text-fg-2">A reforzar: {m.criterioMasBajo}</p>}
                      </div>
                    ))}
                  </Card>
                ))}
              </div>
            </Section>
            {p.aReforzar.length > 0 && (
              <Section title="Aspectos a reforzar (según IA)">
                <div className="space-y-2">{p.aReforzar.map((a) => <Alert key={a.criterio} tone="warning" action={<span className="text-xs text-fg-2">{a.modulos} módulo{a.modulos > 1 ? 's' : ''}</span>}>{a.criterio}</Alert>)}</div>
              </Section>
            )}
            <Alert tone={recom.tone} className="mt-5" action={<Button size="sm" variant="secondary" asChild><Link href={`/admin/feedback?participante=${p.participanteId}${primera ? `&capacitacion=${primera}` : ''}`}>Dar feedback →</Link></Button>}>
              {recom.txt}
            </Alert>
          </>
        );
      }}
    </Consulta>
  );
}

