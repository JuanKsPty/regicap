'use client';

import type { EstadoInscripcion, FiltrosResultados, ResultadosDto } from '@regicap/types';
import { Button, Field, Input, Select } from '@regicap/ui';
import { FilterX } from 'lucide-react';

const ESTADOS: { v: EstadoInscripcion; t: string }[] = [
  { v: 'PENDIENTE', t: 'Pendiente' },
  { v: 'EN_CURSO', t: 'En curso' },
  { v: 'COMPLETADA', t: 'Completada' },
];

/** Filtros: capacitación · cohorte · participante · período · estado. */
export function FiltrosResultadosBar({ filtros, onChange, opciones }: { filtros: FiltrosResultados; onChange: (f: FiltrosResultados) => void; opciones?: ResultadosDto['opciones'] }) {
  const set = <K extends keyof FiltrosResultados>(k: K, v: FiltrosResultados[K] | '') => {
    const next = { ...filtros };
    if (v === '' || v === undefined) delete next[k];
    else next[k] = v as FiltrosResultados[K];
    onChange(next);
  };
  const hay = Object.keys(filtros).length > 0;
  return (
    <div className="mb-4 rounded-[10px] border border-border bg-card p-3.5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Field label="Capacitación" className="col-span-2 lg:col-span-1">
          <Select value={filtros.capacitacionId ?? ''} onChange={(e) => set('capacitacionId', e.target.value)}>
            <option value="">Todas</option>
            {opciones?.capacitaciones.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Cohorte">
          <Select value={filtros.cohorte ?? ''} onChange={(e) => set('cohorte', e.target.value)}>
            <option value="">Todas</option>
            {opciones?.cohortes.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Participante" className="col-span-2 lg:col-span-1">
          <Select value={filtros.participanteId ?? ''} onChange={(e) => set('participanteId', e.target.value)}>
            <option value="">Todos</option>
            {opciones?.participantes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Estado">
          <Select value={filtros.estado ?? ''} onChange={(e) => set('estado', e.target.value as EstadoInscripcion)}>
            <option value="">Todos</option>
            {ESTADOS.map((e) => <option key={e.v} value={e.v}>{e.t}</option>)}
          </Select>
        </Field>
        <Field label="Desde">
          <Input type="date" value={filtros.desde ?? ''} onChange={(e) => set('desde', e.target.value)} />
        </Field>
        <Field label="Hasta">
          <Input type="date" value={filtros.hasta ?? ''} onChange={(e) => set('hasta', e.target.value)} />
        </Field>
      </div>
      {hay && (
        <div className="mt-3">
          <Button size="sm" variant="ghost" onClick={() => onChange({})}>
            <FilterX className="size-3.5" aria-hidden /> Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
