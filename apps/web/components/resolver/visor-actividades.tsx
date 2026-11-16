'use client';

import { youtubeId, type ActividadDto } from '@regicap/types';
import { Badge, Card, cn } from '@regicap/ui';
import { ExternalLink, FileText, PlayCircle, ScrollText } from 'lucide-react';
import { useState } from 'react';

const ICONO = { PDF: FileText, TEXTO: ScrollText, VIDEO: PlayCircle } as const;
const ETIQUETA = { PDF: 'PDF', TEXTO: 'Lectura', VIDEO: 'Video' } as const;

function Contenido({ a }: { a: ActividadDto }) {
  if (a.tipo === 'TEXTO') {
    // El HTML llega saneado desde la API (lista blanca de etiquetas)
    return <div className="contenido-rico min-h-60 px-4 py-5 sm:px-6" dangerouslySetInnerHTML={{ __html: a.contenido ?? '' }} />;
  }
  if (a.tipo === 'VIDEO') {
    const id = youtubeId(a.contenido ?? '');
    return id ? (
      <div className="aspect-video w-full bg-navy">
        <iframe
          title={a.titulo}
          src={`https://www.youtube-nocookie.com/embed/${id}`}
          className="size-full"
          allow="accelerometer; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    ) : (
      <p className="p-6 text-sm text-fg-2">El enlace del video no es válido.</p>
    );
  }
  return a.archivoUrl ? (
    <div>
      <iframe title={a.titulo} src={a.archivoUrl} className="h-[65vh] min-h-80 w-full border-0" />
      <div className="border-t border-border-subtle px-4 py-2 text-right">
        <a href={a.archivoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          Abrir en una pestaña nueva <ExternalLink className="size-3" aria-hidden />
        </a>
      </div>
    </div>
  ) : (
    <div className="grid min-h-60 place-items-center p-6 text-center">
      <div>
        <FileText className="mx-auto size-10 text-fg-3" aria-hidden />
        <p className="mt-2 text-sm font-semibold">{a.titulo}</p>
        <p className="text-xs text-fg-2">Vista previa no disponible para este archivo.</p>
      </div>
    </div>
  );
}

/** Contenido del módulo: lista de actividades + visor (PDF · lectura · video). */
export function VisorActividades({ actividades, tienePreguntas, onIrATest }: { actividades: ActividadDto[]; tienePreguntas: boolean; onIrATest: () => void }) {
  const [activaId, setActivaId] = useState(actividades[0]?.id);
  if (!actividades.length) {
    return (
      <Card className="mb-4 py-8 text-center">
        <ScrollText className="mx-auto size-8 text-fg-3" aria-hidden />
        <p className="mt-2 text-[13px] text-fg-2">Este módulo aún no tiene actividades de contenido. Resuelve las preguntas de abajo.</p>
      </Card>
    );
  }
  const activa = actividades.find((a) => a.id === activaId) ?? actividades[0]!;
  const idx = actividades.findIndex((a) => a.id === activa.id);

  return (
    <Card className="mb-4 overflow-hidden p-0">
      <div className="lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
        <div className="max-h-72 overflow-y-auto border-b border-border p-2.5 lg:max-h-[75vh] lg:border-b-0 lg:border-r">
          <div className="px-1.5 pb-2 text-[10px] font-bold uppercase tracking-[0.5px] text-fg-2">Actividades del módulo · {actividades.length}</div>
          {actividades.map((a) => {
            const Icon = ICONO[a.tipo];
            const on = a.id === activa.id;
            return (
              <button key={a.id} onClick={() => setActivaId(a.id)} aria-current={on} className={cn('mb-0.5 flex w-full items-start gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-bg-2', on && 'bg-primary-light hover:bg-primary-light')}>
                <Icon className={cn('mt-0.5 size-4 shrink-0', on ? 'text-primary' : 'text-fg-2')} aria-hidden />
                <span className="min-w-0">
                  <span className={cn('block text-xs leading-snug', on ? 'font-bold text-primary' : 'font-medium text-fg')}>{a.titulo}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.4px] text-fg-3">{ETIQUETA[a.tipo]}</span>
                </span>
              </button>
            );
          })}
          {tienePreguntas && (
            <button onClick={onIrATest} className="mt-1 flex w-full items-start gap-2.5 rounded-lg border-t border-dashed border-border p-2 pt-3 text-left hover:bg-bg-2">
              <span aria-hidden className="mt-0.5 text-sm">📋</span>
              <span className="text-xs font-medium text-fg">Ir al test del módulo</span>
            </button>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.4px] text-fg-2">Actividad {idx + 1} de {actividades.length}</div>
              <div className="truncate text-[13px] font-bold text-fg">{activa.titulo}</div>
            </div>
            <Badge tone="neutral">{ETIQUETA[activa.tipo]}</Badge>
          </div>
          <Contenido a={activa} />
        </div>
      </div>
    </Card>
  );
}
