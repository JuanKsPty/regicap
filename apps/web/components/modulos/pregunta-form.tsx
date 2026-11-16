'use client';

import { preguntaSchema, type TipoPregunta } from '@regicap/types';
import { Alert, Button, Field, Input, Select, Textarea } from '@regicap/ui';
import { useState } from 'react';
import { useToast } from '@/components/toast';
import { ApiError } from '@/lib/api-client';
import { mensajeDe } from '@/lib/forms';
import { useModulosMutations } from '@/lib/queries';

export const ETIQUETA_PREGUNTA: Record<TipoPregunta, string> = { SIMPLE: 'Opción múltiple', TEXTO_LIBRE: 'Texto libre', CUANTITATIVA: 'Cuantitativa', CUALITATIVA: 'Cualitativa' };
const AYUDA: Record<TipoPregunta, string> = {
  SIMPLE: 'La IA compara la respuesta del participante con la correcta (100 si coincide, 0 si no).',
  TEXTO_LIBRE: 'Respuesta abierta breve; la IA la evalúa (pertinencia, claridad, profundidad) según la rúbrica que definas.',
  CUANTITATIVA: 'Respuesta numérica; es correcta si cae dentro de la tolerancia sobre el valor esperado y decrece con el error.',
  CUALITATIVA: 'Respuesta argumentativa; la IA evalúa coherencia y profundidad según la rúbrica.',
};

/** CU-12: constructor de preguntas del test (los pesos del test deben sumar 100 %). */
export function PreguntaForm({ moduloId, pesoDisponible }: { moduloId: string; pesoDisponible: number }) {
  const { crearPregunta } = useModulosMutations('');
  const { toast } = useToast();
  const [tipo, setTipo] = useState<TipoPregunta>('SIMPLE');
  const [texto, setTexto] = useState('');
  const [peso, setPeso] = useState('');
  const [opciones, setOpciones] = useState('');
  const [correcta, setCorrecta] = useState('');
  const [esperado, setEsperado] = useState('');
  const [tolerancia, setTolerancia] = useState('');
  const [rubrica, setRubrica] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});

  const lista = opciones.split('\n').map((o) => o.trim()).filter(Boolean);

  async function enviar() {
    setErrores({});
    const base = { texto: texto.trim(), peso: peso === '' ? undefined : Number(peso) };
    const candidato =
      tipo === 'SIMPLE' ? { ...base, tipo, opciones: lista, respuestaCorrecta: correcta }
      : tipo === 'CUANTITATIVA' ? { ...base, tipo, valorEsperado: esperado === '' ? undefined : Number(esperado), tolerancia: tolerancia === '' ? undefined : Number(tolerancia) }
      : { ...base, tipo, rubrica: rubrica.trim() };
    const r = preguntaSchema.safeParse(candidato);
    if (!r.success) {
      const e: Record<string, string> = {};
      for (const i of r.error.issues) e[String(i.path[0])] ??= i.message;
      return setErrores(e);
    }
    try {
      await crearPregunta.mutateAsync({ moduloId, data: r.data });
      toast('Pregunta agregada al test.');
      setTexto(''); setPeso(''); setOpciones(''); setCorrecta(''); setEsperado(''); setTolerancia(''); setRubrica('');
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.campos).length) setErrores(e.campos);
      else setErrores({ _: mensajeDe(e) });
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-dashed border-border bg-bg/60 p-3.5">
      <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.5px] text-fg-2">Agregar pregunta al test</div>
      <div className="space-y-3">
        <Field label="Enunciado" error={errores.texto}>
          <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Enunciado de la pregunta" aria-invalid={!!errores.texto} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <Field label="Tipo de pregunta" hint={AYUDA[tipo]}>
            <Select value={tipo} onChange={(e) => { setTipo(e.target.value as TipoPregunta); setErrores({}); }}>
              {(Object.keys(ETIQUETA_PREGUNTA) as TipoPregunta[]).map((t) => <option key={t} value={t}>{ETIQUETA_PREGUNTA[t]}</option>)}
            </Select>
          </Field>
          <Field label="Peso (%)" error={errores.peso} hint={`Disponible: ${Math.max(0, Math.round(pesoDisponible * 100) / 100)} %`}>
            <Input type="number" inputMode="decimal" min={1} max={100} value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="Ej. 40" aria-invalid={!!errores.peso} />
          </Field>
        </div>

        {tipo === 'SIMPLE' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Opciones (una por línea)" error={errores.opciones}>
              <Textarea rows={4} value={opciones} onChange={(e) => setOpciones(e.target.value)} placeholder={'16 bits\n32 bits\n48 bits'} aria-invalid={!!errores.opciones} />
            </Field>
            <Field label="Respuesta correcta" error={errores.respuestaCorrecta}>
              <Select value={correcta} onChange={(e) => setCorrecta(e.target.value)} aria-invalid={!!errores.respuestaCorrecta}>
                <option value="">Elige la correcta…</option>
                {lista.map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
            </Field>
          </div>
        )}
        {tipo === 'CUANTITATIVA' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Valor esperado" error={errores.valorEsperado}>
              <Input type="number" inputMode="decimal" value={esperado} onChange={(e) => setEsperado(e.target.value)} placeholder="Ej. 8" aria-invalid={!!errores.valorEsperado} />
            </Field>
            <Field label="Tolerancia (%)" error={errores.tolerancia}>
              <Input type="number" inputMode="decimal" min={0} max={100} value={tolerancia} onChange={(e) => setTolerancia(e.target.value)} placeholder="Ej. 10" aria-invalid={!!errores.tolerancia} />
            </Field>
          </div>
        )}
        {(tipo === 'TEXTO_LIBRE' || tipo === 'CUALITATIVA') && (
          <Field label="Rúbrica (qué se espera en la respuesta)" error={errores.rubrica}>
            <Input value={rubrica} onChange={(e) => setRubrica(e.target.value)} placeholder="Ej. menciona la porción de red y la de host" aria-invalid={!!errores.rubrica} />
          </Field>
        )}
        {errores._ && <Alert tone="error">{errores._}</Alert>}
        <div className="flex justify-end">
          <Button size="sm" onClick={enviar} loading={crearPregunta.isPending}>+ Pregunta al test</Button>
        </div>
      </div>
    </div>
  );
}
