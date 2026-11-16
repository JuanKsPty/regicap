'use client';

import type { ContenidoRespuesta, ModuloDetalleDto, PreguntaParticipanteDto } from '@regicap/types';
import { Alert, Badge, Button, Card, Field, Input, Skeleton, Textarea, cn } from '@regicap/ui';
import { Clock, Send } from 'lucide-react';
import { useRef, useState } from 'react';
import { colorPuntaje, NivelBadge } from '@/components/inscripciones/estado-inscripcion-badge';
import { Consulta, PageHeader } from '@/components/page';
import { useToast } from '@/components/toast';
import { ApiError } from '@/lib/api-client';
import { mensajeDe } from '@/lib/forms';
import { useModuloDetalle, useResolverModulo } from '@/lib/queries';
import { VisorActividades } from './visor-actividades';

const ETIQUETA: Record<string, string> = { SIMPLE: 'Opción múltiple', TEXTO_LIBRE: 'Texto libre', CUANTITATIVA: 'Cuantitativa', CUALITATIVA: 'Cualitativa' };

function Pregunta({ p, valor, onChange, error, deshabilitado }: { p: PreguntaParticipanteDto; valor: string; onChange: (v: string) => void; error?: string; deshabilitado: boolean }) {
  return (
    <fieldset className={cn('mb-3 rounded-lg border bg-bg/60 p-3.5', error ? 'border-danger' : 'border-border')} disabled={deshabilitado}>
      <legend className="sr-only">{p.texto}</legend>
      <div className="mb-1.5 flex items-center gap-2">
        <Badge tone="neutral">{ETIQUETA[p.tipo]} · {p.peso} %</Badge>
      </div>
      <p className="mb-2.5 text-[13px] font-semibold leading-snug text-fg">{p.texto}</p>
      {p.tipo === 'SIMPLE' && (
        <div className="space-y-1.5" role="radiogroup" aria-label={p.texto}>
          {p.opciones?.map((o) => (
            <label key={o} className={cn('flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[13px] transition-colors', valor === o ? 'border-primary bg-primary-light' : 'border-border bg-card hover:bg-bg-2', deshabilitado && 'cursor-default')}>
              <input type="radio" name={`q-${p.id}`} value={o} checked={valor === o} onChange={() => onChange(o)} className="size-4 accent-[var(--color-primary)]" />
              {o}
            </label>
          ))}
        </div>
      )}
      {p.tipo === 'CUANTITATIVA' && (
        <Input inputMode="decimal" value={valor} onChange={(e) => onChange(e.target.value)} placeholder="Ingresa un valor numérico" aria-invalid={!!error} aria-label={p.texto} />
      )}
      {(p.tipo === 'TEXTO_LIBRE' || p.tipo === 'CUALITATIVA') && (
        <Textarea value={valor} onChange={(e) => onChange(e.target.value)} placeholder="Escribe tu respuesta…" aria-invalid={!!error} aria-label={p.texto} />
      )}
      {error && <p role="alert" className="mt-1.5 text-xs font-medium text-danger-fg">{error}</p>}
    </fieldset>
  );
}

function Resultado({ m }: { m: ModuloDetalleDto }) {
  if (m.estado !== 'ENVIADO') return null;
  if (m.pendienteCalificacion) {
    return (
      <Alert tone="warning" className="mb-4">
        <div className="flex items-center gap-1.5 font-semibold"><Clock className="size-4" aria-hidden /> Pendiente de calificación</div>
        Recibimos tus respuestas. La inteligencia artificial las está calificando; esta página se actualiza sola
        {m.calificacion?.estado === 'ERROR' ? ' (el servicio tardó más de lo esperado: seguimos intentando, tus respuestas están a salvo).' : '.'}
      </Alert>
    );
  }
  const c = m.calificacion!;
  return (
    <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-success/40 bg-success-bg">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.5px] text-success-fg">Módulo enviado y calificado</div>
        <div className="mt-0.5 flex items-center gap-2.5">
          <span className={cn('text-3xl font-bold', colorPuntaje(c.puntaje))}>{c.puntaje} pts</span>
          <NivelBadge nivel={c.nivel} />
        </div>
      </div>
      {c.criterioMasBajo && <p className="max-w-xs text-xs text-fg-2">Aspecto a reforzar: <strong className="text-fg">{c.criterioMasBajo}</strong></p>}
    </Card>
  );
}

function Formulario({ m, inscripcionId, moduloId }: { m: ModuloDetalleDto; inscripcionId: string; moduloId: string }) {
  const { guardar, enviar } = useResolverModulo(inscripcionId, moduloId);
  const { toast } = useToast();
  const enviado = m.estado === 'ENVIADO';
  const esTest = m.tipo === 'TEST';
  const sinPreguntas = m.preguntas.length === 0 && !esTest;
  const testRef = useRef<HTMLDivElement>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [reflexion, setReflexion] = useState({ aprendido: m.respuesta?.reflexion?.aprendido ?? '', aplicacion: m.respuesta?.reflexion?.aplicacion ?? '' });
  const [valores, setValores] = useState<Record<string, string>>(Object.fromEntries((m.respuesta?.examen ?? []).map((e) => [e.preguntaId, e.valor])));

  const contenido = (): ContenidoRespuesta => ({
    ...(sinPreguntas ? { reflexion } : {}),
    examen: m.preguntas.map((p) => ({ preguntaId: p.id, valor: valores[p.id] ?? '' })).filter((e) => e.valor !== ''),
  });

  async function accion(tipo: 'guardar' | 'enviar') {
    setErrores({});
    try {
      await (tipo === 'guardar' ? guardar : enviar).mutateAsync(contenido());
      toast(tipo === 'guardar' ? 'Borrador guardado.' : 'Respuestas enviadas. Te avisaremos el puntaje en unos segundos.', 'success');
      if (tipo === 'enviar') window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.campos).length) {
        setErrores(e.campos); // mensajes junto a cada pregunta, sin perder lo respondido
        toast('Revisa las preguntas marcadas.', 'error');
      } else toast(mensajeDe(e), 'error');
    }
  }

  // Agrupa la evaluación final por módulo de origen
  const grupos: { titulo?: string; preguntas: PreguntaParticipanteDto[] }[] = [];
  for (const p of m.preguntas) {
    const g = grupos.find((x) => x.titulo === p.moduloNombre);
    if (g) g.preguntas.push(p);
    else grupos.push({ titulo: p.moduloNombre, preguntas: [p] });
  }

  return (
    <>
      {!esTest && <VisorActividades actividades={m.actividades} tienePreguntas={m.preguntas.length > 0} onIrATest={() => testRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />}
      <Card className="max-w-3xl">
        {!enviado && (
          <Alert tone="info" className="mb-4">
            {esTest
              ? `Evaluación final: reúne los cuestionarios de todos los módulos (${m.preguntas.length} pregunta${m.preguntas.length === 1 ? '' : 's'}). Responde todo para finalizar el curso.`
              : 'Resuelve las actividades del módulo. Tus respuestas serán calificadas por la Inteligencia Artificial y revisadas por tu administrador.'}
          </Alert>
        )}
        {sinPreguntas && (
          <div className="space-y-4">
            <Field label="1. Describe brevemente lo aprendido en este módulo" error={errores['reflexion.aprendido']}>
              <Textarea value={reflexion.aprendido} disabled={enviado} onChange={(e) => setReflexion({ ...reflexion, aprendido: e.target.value })} aria-invalid={!!errores['reflexion.aprendido']} />
            </Field>
            <Field label="2. ¿Cómo aplicarías este contenido en tu emprendimiento?" error={errores['reflexion.aplicacion']}>
              <Textarea value={reflexion.aplicacion} disabled={enviado} onChange={(e) => setReflexion({ ...reflexion, aplicacion: e.target.value })} aria-invalid={!!errores['reflexion.aplicacion']} />
            </Field>
          </div>
        )}
        {m.preguntas.length > 0 && (
          <div ref={testRef} className="scroll-mt-20">
            {!esTest && <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.5px] text-fg-2">📋 Test del módulo · {m.preguntas.length} pregunta{m.preguntas.length === 1 ? '' : 's'}</div>}
            {grupos.map((g) => (
              <div key={g.titulo ?? 'x'}>
                {g.titulo && <div className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-[0.4px] text-primary">{g.titulo}</div>}
                {g.preguntas.map((p) => (
                  <Pregunta key={p.id} p={p} valor={valores[p.id] ?? ''} onChange={(v) => setValores((s) => ({ ...s, [p.id]: v }))} error={errores[p.id]} deshabilitado={enviado} />
                ))}
              </div>
            ))}
          </div>
        )}
        {esTest && m.preguntas.length === 0 && <p className="text-[13px] text-fg-2">Los módulos de contenido aún no tienen preguntas configuradas.</p>}
        {!enviado ? (
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => accion('guardar')} loading={guardar.isPending} disabled={enviar.isPending}>Guardar borrador</Button>
            <Button onClick={() => accion('enviar')} loading={enviar.isPending} disabled={guardar.isPending || (esTest && m.preguntas.length === 0)}>
              <Send className="size-3.5" aria-hidden /> {esTest ? 'Enviar evaluación final' : 'Enviar respuestas'}
            </Button>
          </div>
        ) : (
          <p className="mt-2 text-xs text-fg-2">Este módulo ya fue enviado y no puede resolverse de nuevo.</p>
        )}
      </Card>
    </>
  );
}

/** CU-05 Resolver módulos: contenido, formulario, borrador y envío (dispara CU-07 de forma asíncrona). */
export function ResolverModuloPage({ inscripcionId, moduloId }: { inscripcionId: string; moduloId: string }) {
  const query = useModuloDetalle(inscripcionId, moduloId);
  // El formulario se (re)inicia solo cuando cambia el módulo o su estado de envío
  const clave = query.data ? `${query.data.id}-${query.data.estado}` : 'cargando';
  return (
    <Consulta query={query} esqueleto={<><Skeleton className="mb-4 h-8 w-64" /><Skeleton className="h-72" /></>}>
      {(m) => (
        <>
          <PageHeader
            back={{ href: `/participante/tomar/${inscripcionId}`, label: 'Módulos' }}
            title={m.tipo === 'TEST' ? `🎯 ${m.nombre}` : `Módulo ${m.orden} · ${m.nombre}`}
            subtitle={`${m.capacitacionNombre} · ${m.empresa}`}
          />
          <Resultado m={m} />
          <Formulario key={clave} m={m} inscripcionId={inscripcionId} moduloId={moduloId} />
        </>
      )}
    </Consulta>
  );
}

