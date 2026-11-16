import type { DistribucionDto } from '@regicap/types';
import { cn } from '@regicap/ui';
import { colorPuntaje, fondoPuntaje } from '@/components/inscripciones/estado-inscripcion-badge';

/** Barra horizontal coloreada por valor (verde ≥ 80, ámbar 60–79, rojo < 60). */
export function BarraPuntaje({ etiqueta, valor, onClick, detalle, titulo }: { etiqueta: string; valor: number | null; onClick?: () => void; detalle?: string; titulo?: string }) {
  const contenido = (
    <>
      <span className="w-[38%] min-w-0 shrink-0 truncate text-left text-xs text-fg sm:w-40" title={etiqueta}>
        {etiqueta}
      </span>
      <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-bg-2">
        <span className={cn('block h-full rounded-full transition-[width] duration-700', fondoPuntaje(valor))} style={{ width: `${valor ?? 0}%` }} />
      </span>
      <span className={cn('w-8 shrink-0 text-right text-xs font-bold', colorPuntaje(valor))}>{valor ?? '—'}</span>
    </>
  );
  const cls = 'flex w-full items-center gap-2.5 rounded-md py-1.5';
  return onClick ? (
    <button onClick={onClick} title={titulo} aria-label={`${etiqueta}: ${valor ?? 'sin datos'}${detalle ? `. ${detalle}` : ''}`} className={cn(cls, 'px-1.5 -mx-1.5 hover:bg-bg-2')}>
      {contenido}
    </button>
  ) : (
    <div className={cls}>{contenido}</div>
  );
}

/** Donut SVG con leyenda (distribución Alto · Medio · Bajo). */
export function Donut({ dist, etiquetaTotal = 'total' }: { dist: DistribucionDto; etiquetaTotal?: string }) {
  const R = 38;
  const C = 2 * Math.PI * R;
  const partes = [
    { k: 'Alto', v: dist.alto, color: 'var(--color-success)' },
    { k: 'Medio', v: dist.medio, color: 'var(--color-warning)' },
    { k: 'Bajo', v: dist.bajo, color: 'var(--color-danger)' },
  ];
  let acum = 0;
  return (
    <div className="flex flex-wrap items-center justify-center gap-5">
      <svg viewBox="0 0 100 100" className="size-[120px] shrink-0 -rotate-90" role="img" aria-label={`Distribución: ${dist.alto} alto, ${dist.medio} medio, ${dist.bajo} bajo`}>
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--color-bg-2)" strokeWidth="14" />
        {dist.total > 0 &&
          partes.map((p) => {
            const largo = (p.v / dist.total) * C;
            const el = p.v > 0 && <circle key={p.k} cx="50" cy="50" r={R} fill="none" stroke={p.color} strokeWidth="14" strokeDasharray={`${largo} ${C - largo}`} strokeDashoffset={-acum} />;
            acum += largo;
            return el;
          })}
        <g className="rotate-90 origin-center">
          <text x="50" y="48" textAnchor="middle" className="fill-fg text-[18px] font-bold">{dist.total}</text>
          <text x="50" y="61" textAnchor="middle" className="fill-fg-2 text-[7px]">{etiquetaTotal}</text>
        </g>
      </svg>
      <ul className="space-y-1.5 text-xs">
        {partes.map((p) => (
          <li key={p.k} className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 rounded-sm" style={{ background: p.color }} />
            <span className="w-12 text-fg-2">{p.k}</span>
            <strong className="text-fg">{dist.total ? Math.round((p.v / dist.total) * 100) : 0}%</strong>
            <span className="text-fg-3">({p.v})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Evolución por cohorte (barras verticales con el valor encima). */
export function EvolucionCohortes({ datos }: { datos: { periodo: string; puntajePromedio: number | null; participantes: number; actual: boolean }[] }) {
  return (
    <div className="flex h-44 items-end gap-3 overflow-x-auto pb-1" role="img" aria-label={`Evolución por cohorte: ${datos.map((d) => `${d.periodo} ${d.puntajePromedio ?? 'sin datos'}`).join(', ')}`}>
      {datos.map((d) => (
        <div key={d.periodo} className="flex h-full min-w-14 flex-1 flex-col items-center justify-end gap-1.5">
          <span className={cn('text-xs font-bold', colorPuntaje(d.puntajePromedio))}>{d.puntajePromedio ?? '—'}</span>
          <div className="flex w-full flex-1 items-end rounded-t-md bg-bg-2/70">
            <div className={cn('w-full rounded-t-md transition-[height] duration-700', d.actual ? 'bg-primary' : 'bg-info/60')} style={{ height: `${d.puntajePromedio ?? 0}%` }} />
          </div>
          <span className={cn('text-[11px]', d.actual ? 'font-bold text-primary' : 'text-fg-2')}>{d.periodo}</span>
          <span className="text-[10px] text-fg-3">{d.participantes} part.</span>
        </div>
      ))}
    </div>
  );
}
