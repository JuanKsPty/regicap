'use client';

import { Card, EmptyState, MetricCard, SectionLabel, Skeleton } from '@regicap/ui';
import { MessageSquare } from 'lucide-react';
import { colorPuntaje, EstadoInscripcionBadge, NivelBadge } from '@/components/inscripciones/estado-inscripcion-badge';
import { Consulta, Cuadricula, PageHeader, Section } from '@/components/page';
import { useFeedbackParticipante } from '@/lib/queries';

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });

/** CU-06 Recibir feedback: comentarios del Administrador, de capacitaciones vigentes e históricas. */
export function RecibirFeedbackPage() {
  const query = useFeedbackParticipante();
  return (
    <>
      <PageHeader title="Revisar feedback" subtitle="Comentarios que tu administrador te envió sobre tu desempeño." />
      <Consulta query={query} esqueleto={<Skeleton className="h-40" />}>
        {(d) => (
          <>
            <Cuadricula cols={3}>
              <MetricCard label="Feedback recibido" value={d.total} hint="mensajes de tu administrador" />
              <MetricCard label="Capacitaciones con feedback" value={d.capacitaciones} hint="con retroalimentación" />
              <MetricCard label="Último feedback" value={d.ultimo ? fecha(d.ultimo) : '—'} hint="fecha más reciente" />
            </Cuadricula>
            <Section title="Retroalimentación por capacitación">
              {d.grupos.length ? (
                <div className="space-y-3">
                  {d.grupos.map((g) => (
                    <Card key={g.capacitacionId} className="rise">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <SectionLabel>{g.empresa}</SectionLabel>
                          <h3 className="mt-0.5 text-[14px] font-semibold text-fg">{g.titulo}</h3>
                          {g.estadoInscripcion && <div className="mt-1.5"><EstadoInscripcionBadge estado={g.estadoInscripcion} /></div>}
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] font-bold uppercase tracking-[0.4px] text-fg-2">Resultado final</div>
                          <div className="mt-0.5 flex items-center justify-end gap-2">
                            <span className={`text-lg font-bold ${colorPuntaje(g.puntaje)}`}>{g.puntaje !== null ? `${g.puntaje} pts` : '—'}</span>
                            <NivelBadge nivel={g.nivel} />
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2 rounded-lg bg-bg p-3">
                        {g.items.map((f) => (
                          <div key={f.id} className="rounded-lg border border-border bg-card px-3 py-2.5">
                            <p className="text-[13px] leading-relaxed text-fg">{f.texto}</p>
                            <p className="mt-1.5 text-[11px] text-fg-2">— {f.administrador} · {fecha(f.fecha)}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState icon={<MessageSquare className="size-7" />} title="Aún no has recibido feedback" description="Cuando tu administrador revise tus resultados y te escriba, lo verás aquí." />
              )}
            </Section>
          </>
        )}
      </Consulta>
    </>
  );
}
