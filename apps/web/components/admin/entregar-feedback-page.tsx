'use client';

import { Alert, Button, Card, Field, Input, Select, SectionLabel, Skeleton, Textarea, cn } from '@regicap/ui';
import { Search, UserRound } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { colorPuntaje, NivelBadge } from '@/components/inscripciones/estado-inscripcion-badge';
import { Consulta, PageHeader } from '@/components/page';
import { useToast } from '@/components/toast';
import { ApiError } from '@/lib/api-client';
import { mensajeDe } from '@/lib/forms';
import { useEnviarFeedback, useFeedbackContexto, useFeedbackListado } from '@/lib/queries';

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });

function Panel({ participanteId, capacitacionId, onCapacitacion }: { participanteId: string; capacitacionId: string | null; onCapacitacion: (id: string) => void }) {
  const query = useFeedbackContexto(participanteId, capacitacionId);
  const enviar = useEnviarFeedback();
  const { toast } = useToast();
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string>();

  return (
    <Consulta query={query} esqueleto={<Skeleton className="h-72" />}>
      {(c) => (
        <>
          <h2 className="mb-3 text-[14px] font-bold">Feedback — {c.nombre}</h2>
          <Field label="Capacitación">
            <Select value={c.capacitacionId ?? ''} onChange={(e) => onCapacitacion(e.target.value)}>
              {c.capacitaciones.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
            </Select>
          </Field>
          <div className="mb-1.5 mt-4 text-[10px] font-bold uppercase tracking-[0.5px] text-fg-2">Respuesta del participante (procesada por IA)</div>
          {c.respuesta ? (
            <>
              <blockquote className="rounded-lg border-l-[3px] border-primary bg-bg p-3 text-[13px] italic leading-relaxed text-fg-2">“{c.respuesta.texto}”</blockquote>
              <p className="mb-4 mt-2 text-xs font-semibold">
                {c.respuesta.pendienteCalificacion ? (
                  <span className="text-warning-fg">Pendiente de calificación · {c.respuesta.modulo}</span>
                ) : (
                  <span className={colorPuntaje(c.respuesta.puntaje)}>
                    Clasificación IA: {c.respuesta.nivel?.[0]}{c.respuesta.nivel?.slice(1).toLowerCase()} · {c.respuesta.puntaje} pts
                    {c.respuesta.criterioMasBajo ? ` · a reforzar: ${c.respuesta.criterioMasBajo}` : ''}
                  </span>
                )}
              </p>
            </>
          ) : (
            <p className="mb-4 rounded-lg bg-bg p-3 text-[13px] text-fg-2">Este participante aún no ha enviado respuestas en esta capacitación.</p>
          )}
          <Field label="Tu feedback" error={error}>
            <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe tu retroalimentación…" aria-invalid={!!error} rows={4} />
          </Field>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setTexto(''); setError(undefined); }} disabled={!texto}>Descartar</Button>
            <Button
              loading={enviar.isPending}
              onClick={async () => {
                setError(undefined);
                try {
                  await enviar.mutateAsync({ participanteId, capacitacionId: c.capacitacionId!, texto });
                  toast('Feedback enviado: el participante ya puede verlo.');
                  setTexto('');
                } catch (e) {
                  if (e instanceof ApiError && e.campos.texto) setError(e.campos.texto);
                  else if (e instanceof ApiError && e.status === 400) setError(e.message);
                  else toast(mensajeDe(e), 'error');
                }
              }}
            >
              Enviar feedback ✓
            </Button>
          </div>
          <div className="mb-2 mt-6 text-[10px] font-bold uppercase tracking-[0.5px] text-fg-2">Historial de feedback enviado</div>
          {c.historial.length ? (
            <ul className="space-y-2">
              {c.historial.map((h) => (
                <li key={h.id} className="rounded-lg border border-border-subtle bg-bg p-3">
                  <p className="text-[13px] leading-relaxed">{h.texto}</p>
                  <p className="mt-1 text-[11px] text-fg-2">{fecha(h.fecha)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-fg-2">Aún no se ha enviado feedback para esta capacitación.</p>
          )}
        </>
      )}
    </Consulta>
  );
}

/** CU-10 Entregar feedback: lista priorizada por bajo rendimiento + panel de feedback. */
export function EntregarFeedbackPage() {
  const params = useSearchParams();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(params.get('participante'));
  const [cap, setCap] = useState<string | null>(params.get('capacitacion'));
  const panel = useRef<HTMLDivElement>(null);
  const lista = useFeedbackListado(q);

  // Selecciona al primero (el de menor rendimiento) si no viene uno en la URL
  useEffect(() => {
    if (!sel && lista.data?.participantes[0]) setSel(lista.data.participantes[0].participanteId);
  }, [sel, lista.data]);

  return (
    <>
      <PageHeader title="Entregar feedback" subtitle="Revisa a los participantes (priorizando bajo rendimiento) y envíales retroalimentación personalizada." />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <Card>
            <SectionLabel className="mb-2.5">Buscar participante</SectionLabel>
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-3" aria-hidden />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre…" className="pl-9" aria-label="Buscar participante" />
            </div>
            <Consulta query={lista} esqueleto={<Skeleton className="h-40" />}>
              {(d) => (
                <ul className="-mx-1.5">
                  {d.participantes.map((p) => (
                    <li key={p.participanteId}>
                      <button
                        onClick={() => { setSel(p.participanteId); setCap(p.peorCapacitacionId); setTimeout(() => panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }}
                        aria-pressed={sel === p.participanteId}
                        className={cn('flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-bg-2', sel === p.participanteId && 'bg-primary-light hover:bg-primary-light')}
                      >
                        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-bg-2 text-fg-2"><UserRound className="size-4" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold">{p.nombre}</span>
                          <span className="block text-[11px] text-fg-2">{p.inscripciones} capacitación{p.inscripciones === 1 ? '' : 'es'}{p.feedbacks ? ` · ${p.feedbacks} feedback` : ''}</span>
                        </span>
                        <span className={`text-sm font-bold ${colorPuntaje(p.peorPuntaje)}`}>{p.peorPuntaje ?? '—'}</span>
                        <NivelBadge nivel={p.peorNivel} />
                      </button>
                    </li>
                  ))}
                  {!d.participantes.length && <li className="px-2 py-4 text-[13px] text-fg-2">Sin coincidencias.</li>}
                </ul>
              )}
            </Consulta>
          </Card>
          {lista.data && lista.data.bajoRendimiento > 0 && (
            <Alert tone="warning" className="mt-3">{lista.data.bajoRendimiento} inscripcion{lista.data.bajoRendimiento === 1 ? '' : 'es'} con rendimiento bajo requieren atención prioritaria.</Alert>
          )}
        </div>
        <Card ref={panel} className="scroll-mt-20 self-start">
          {sel ? <Panel key={sel} participanteId={sel} capacitacionId={cap} onCapacitacion={setCap} /> : <p className="text-[13px] text-fg-2">Selecciona un participante para ver su detalle.</p>}
        </Card>
      </div>
    </>
  );
}

