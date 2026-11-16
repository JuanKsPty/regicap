'use client';

import type { ActividadDto, ModuloEmpresaDto } from '@regicap/types';
import { Badge, Button, Card, ConfirmDialog, cn } from '@regicap/ui';
import { ChevronDown, ChevronDown as Abajo, ChevronUp, FileText, Pencil, PlayCircle, ScrollText, Target, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/components/toast';
import { mensajeDe } from '@/lib/forms';
import { useModulosMutations } from '@/lib/queries';
import { ActividadEditar, ActividadForm } from './actividad-form';
import { ETIQUETA_PREGUNTA, PreguntaForm } from './pregunta-form';

export const ICONO_ACTIVIDAD = { PDF: FileText, TEXTO: ScrollText, VIDEO: PlayCircle } as const;
export const ETIQUETA_ACTIVIDAD = { PDF: 'PDF', TEXTO: 'Lectura', VIDEO: 'Video' } as const;

function FilaActividad({ a, onEditar, onEliminar }: { a: ActividadDto; onEditar: () => void; onEliminar: () => void }) {
  const Icon = ICONO_ACTIVIDAD[a.tipo];
  return (
    <li className="flex items-center gap-2.5 border-b border-border-subtle py-2 text-[13px] last:border-0">
      <Icon className="size-4 shrink-0 text-fg-2" aria-hidden />
      <span className="min-w-0 flex-1 truncate font-medium text-fg">{a.titulo}</span>
      <Badge tone="neutral">{ETIQUETA_ACTIVIDAD[a.tipo]}</Badge>
      <button aria-label={`Editar ${a.titulo}`} onClick={onEditar} className="grid size-8 place-items-center rounded-md text-fg-2 hover:bg-bg-2 hover:text-primary">
        <Pencil className="size-3.5" />
      </button>
      <button aria-label={`Eliminar ${a.titulo}`} onClick={onEliminar} className="grid size-8 place-items-center rounded-md text-fg-2 hover:bg-danger-bg hover:text-danger-fg">
        <Trash2 className="size-3.5" />
      </button>
    </li>
  );
}

/** Módulo de una capacitación (acordeón): actividades, test y orden. */
export function ModuloCard({
  capacitacionId,
  modulo,
  primero,
  ultimo,
  expandido,
  onToggle,
}: {
  capacitacionId: string;
  modulo: ModuloEmpresaDto;
  primero: boolean;
  ultimo: boolean;
  expandido: boolean;
  onToggle: () => void;
}) {
  const m = useModulosMutations(capacitacionId);
  const { toast } = useToast();
  const [editando, setEditando] = useState<string | null>(null);
  const [borrarActividad, setBorrarActividad] = useState<ActividadDto | null>(null);
  const [borrarModulo, setBorrarModulo] = useState(false);
  const [borrarPregunta, setBorrarPregunta] = useState<string | null>(null);
  const esTest = modulo.tipo === 'TEST';
  const ok = Math.abs(modulo.pesoTotal - 100) < 0.01;

  const intentar = async (fn: () => Promise<unknown>, mensaje?: string) => {
    try {
      await fn();
      if (mensaje) toast(mensaje);
    } catch (e) {
      toast(mensajeDe(e), 'error');
    }
  };

  return (
    <Card className={cn('mb-2.5 p-0', esTest && 'border-dashed', expandido && 'border-primary/40')}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex shrink-0 flex-col">
          <button aria-label="Subir módulo" disabled={primero} onClick={() => intentar(() => m.mover.mutateAsync({ id: modulo.id, direccion: -1 }))} className="grid h-4 w-6 place-items-center rounded text-fg-2 hover:bg-bg-2 disabled:opacity-30">
            <ChevronUp className="size-3.5" />
          </button>
          <button aria-label="Bajar módulo" disabled={ultimo} onClick={() => intentar(() => m.mover.mutateAsync({ id: modulo.id, direccion: 1 }))} className="grid h-4 w-6 place-items-center rounded text-fg-2 hover:bg-bg-2 disabled:opacity-30">
            <Abajo className="size-3.5" />
          </button>
        </div>
        <button onClick={onToggle} aria-expanded={expandido} className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 text-left">
          <span className="min-w-0 truncate text-[13px] font-bold text-fg">
            {esTest ? <Target className="mr-1 inline size-3.5 text-primary" aria-hidden /> : null}
            {esTest ? modulo.nombre : `Módulo ${modulo.orden} · ${modulo.nombre}`}
          </span>
          <Badge tone={esTest ? 'curso' : 'neutral'} className="hidden shrink-0 sm:inline-flex">{esTest ? 'Evaluación final' : 'Contenido'}</Badge>
          {modulo.preguntas.length > 0 && !ok && <Badge tone="medio" className="shrink-0">Pesos {modulo.pesoTotal} %</Badge>}
          <ChevronDown className={cn('ml-auto size-4 shrink-0 text-fg-2 transition-transform', expandido && 'rotate-180')} aria-hidden />
        </button>
        <Button size="sm" variant="danger" aria-label={`Eliminar módulo ${modulo.nombre}`} onClick={() => setBorrarModulo(true)}>
          <Trash2 className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">Eliminar</span>
        </Button>
      </div>

      {expandido && (
        <div className="border-t border-border-subtle px-3.5 pb-4 pt-3">
          {esTest ? (
            <div className="rounded-lg bg-primary-light px-3 py-2.5 text-xs text-primary">
              Módulo de <strong>evaluación final</strong>: reúne automáticamente las <strong>{modulo.preguntasHeredadas}</strong> pregunta{modulo.preguntasHeredadas === 1 ? '' : 's'} de los módulos de contenido y puedes sumarle preguntas exclusivas de esta evaluación.
            </div>
          ) : (
            <>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.5px] text-fg-2">Actividades del módulo</div>
              {modulo.actividades.length ? (
                <ul>
                  {modulo.actividades.map((a) =>
                    editando === a.id ? (
                      <li key={a.id}>
                        <ActividadEditar actividad={a} onTerminar={() => setEditando(null)} />
                      </li>
                    ) : (
                      <FilaActividad key={a.id} a={a} onEditar={() => setEditando(a.id)} onEliminar={() => setBorrarActividad(a)} />
                    ),
                  )}
                </ul>
              ) : (
                <p className="text-xs text-fg-2">Sin actividades aún — agrega la primera abajo.</p>
              )}
              <ActividadForm moduloId={modulo.id} />
            </>
          )}

          <div className="mb-1 mt-5 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.5px] text-fg-2">{esTest ? 'Preguntas nuevas de la evaluación final' : 'Test del módulo (opcional)'}</div>
            {modulo.preguntas.length > 0 && (
              <Badge tone={ok ? 'alto' : 'medio'}>Pesos: {modulo.pesoTotal} / 100 %</Badge>
            )}
          </div>
          {modulo.preguntas.length ? (
            <ul>
              {modulo.preguntas.map((p) => (
                <li key={p.id} className="flex items-center gap-2 border-b border-border-subtle py-2 text-[13px] last:border-0">
                  <Badge tone="neutral" className="shrink-0">{ETIQUETA_PREGUNTA[p.tipo]}</Badge>
                  <span className="min-w-0 flex-1 font-medium">{p.texto}</span>
                  <span className="shrink-0 text-xs font-semibold text-fg-2">{p.peso} %</span>
                  <button aria-label="Eliminar pregunta" onClick={() => setBorrarPregunta(p.id)} className="grid size-8 shrink-0 place-items-center rounded-md text-fg-2 hover:bg-danger-bg hover:text-danger-fg">
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-fg-2">{esTest ? 'Aún no hay preguntas propias — la evaluación usará solo las de los módulos de contenido.' : 'Sin test configurado — el módulo solo pide una reflexión libre.'}</p>
          )}
          <PreguntaForm moduloId={modulo.id} pesoDisponible={100 - modulo.pesoTotal} />
        </div>
      )}

      <ConfirmDialog
        open={borrarModulo}
        onOpenChange={setBorrarModulo}
        title="¿Eliminar este módulo?"
        description="Se eliminarán también sus actividades y preguntas. Si hay participantes inscritos en la capacitación, no podrá eliminarse."
        confirmLabel="Eliminar módulo"
        destructive
        loading={m.eliminar.isPending}
        onConfirm={() => intentar(() => m.eliminar.mutateAsync(modulo.id), 'Módulo eliminado.').finally(() => setBorrarModulo(false))}
      />
      <ConfirmDialog
        open={!!borrarActividad}
        onOpenChange={(o) => !o && setBorrarActividad(null)}
        title="¿Eliminar esta actividad?"
        description={<>Se eliminará <strong className="text-fg">«{borrarActividad?.titulo}»</strong>.</>}
        confirmLabel="Eliminar"
        destructive
        loading={m.eliminarActividad.isPending}
        onConfirm={() => intentar(() => m.eliminarActividad.mutateAsync(borrarActividad!.id), 'Actividad eliminada.').finally(() => setBorrarActividad(null))}
      />
      <ConfirmDialog
        open={!!borrarPregunta}
        onOpenChange={(o) => !o && setBorrarPregunta(null)}
        title="¿Eliminar esta pregunta del test?"
        description="El peso que ocupaba queda disponible para otras preguntas."
        confirmLabel="Eliminar"
        destructive
        loading={m.eliminarPregunta.isPending}
        onConfirm={() => intentar(() => m.eliminarPregunta.mutateAsync(borrarPregunta!), 'Pregunta eliminada.').finally(() => setBorrarPregunta(null))}
      />
    </Card>
  );
}
