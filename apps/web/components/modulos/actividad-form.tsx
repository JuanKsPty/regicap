'use client';

import { actividadSchema, MAX_PDF_BYTES, type ActividadDto } from '@regicap/types';
import { Alert, Button, Field, Input, Select } from '@regicap/ui';
import { FileText, Paperclip } from 'lucide-react';
import { useRef, useState } from 'react';
import { useToast } from '@/components/toast';
import { ApiError } from '@/lib/api-client';
import { mensajeDe } from '@/lib/forms';
import { subirPdf, useModulosMutations } from '@/lib/queries';
import { RichTextEditor } from './rich-text-editor';

type Tipo = 'PDF' | 'TEXTO' | 'VIDEO';
const ETIQUETA: Record<Tipo, string> = { PDF: 'PDF (adjuntar archivo)', TEXTO: 'Lectura (texto enriquecido)', VIDEO: 'Video (enlace de YouTube)' };

/** Selector de PDF con la validación de tipo y tamaño (3 MB) en el navegador. */
function SelectorPdf({ archivo, onChange, error, actual }: { archivo: File | null; onChange: (f: File | null) => void; error?: string; actual?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [local, setLocal] = useState<string>();
  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={`flex w-full items-center gap-3 rounded-lg border border-dashed px-3 py-3 text-left transition-colors hover:bg-bg-2 ${error ? 'border-danger' : 'border-border'}`}
      >
        <Paperclip className="size-5 shrink-0 text-fg-2" aria-hidden />
        <span className="min-w-0 text-[13px]">
          {archivo ? <strong className="break-all">{archivo.name}</strong> : <>Haz clic para <strong>{actual ? 'reemplazar el PDF' : 'adjuntar un PDF'}</strong></>}
          <span className="block text-[11px] text-fg-2">{archivo ? `${(archivo.size / 1024).toFixed(0)} KB` : actual ? 'Opcional · máx. 3 MB' : 'Máx. 3 MB'}</span>
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="application/pdf"
        className="sr-only"
        aria-label="Archivo PDF"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setLocal(undefined);
          if (f && f.type !== 'application/pdf') return setLocal('Solo se permiten archivos PDF.'), onChange(null);
          if (f && f.size > MAX_PDF_BYTES) return setLocal('El PDF debe pesar 3 MB o menos.'), onChange(null);
          onChange(f);
        }}
      />
      {(local || error) && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-danger-fg">
          {local || error}
        </p>
      )}
    </div>
  );
}

/** CU-12: agregar una actividad (PDF · lectura · video de YouTube) a un módulo. */
export function ActividadForm({ moduloId }: { moduloId: string }) {
  const { crearActividad } = useModulosMutations('');
  const { toast } = useToast();
  const [tipo, setTipo] = useState<Tipo>('PDF');
  const [titulo, setTitulo] = useState('');
  const [url, setUrl] = useState('');
  const [html, setHtml] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [claveEditor, setClaveEditor] = useState(0);
  const [subiendo, setSubiendo] = useState(false);

  async function enviar() {
    setErrores({});
    try {
      let candidato: unknown;
      if (tipo === 'PDF') {
        if (!archivo) return setErrores({ archivoKey: 'Adjunta un archivo PDF.' });
        setSubiendo(true);
        const archivoKey = await subirPdf(archivo);
        candidato = { tipo, titulo: titulo.trim() || archivo.name.replace(/\.pdf$/i, ''), archivoKey };
      } else if (tipo === 'TEXTO') {
        candidato = { tipo, titulo: titulo.trim(), contenido: html };
      } else {
        candidato = { tipo, titulo: titulo.trim(), contenido: url.trim() };
      }
      const r = actividadSchema.safeParse(candidato);
      if (!r.success) {
        setErrores(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
        return;
      }
      await crearActividad.mutateAsync({ moduloId, data: r.data });
      toast('Actividad agregada.');
      setTitulo('');
      setUrl('');
      setHtml('');
      setArchivo(null);
      setClaveEditor((n) => n + 1);
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.campos).length) setErrores(e.campos);
      else setErrores({ _: mensajeDe(e) });
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-dashed border-border bg-bg/60 p-3.5">
      <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.5px] text-fg-2">Agregar actividad (se mostrará al participante)</div>
      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <Field label="Título de la actividad" error={errores.titulo}>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={tipo === 'PDF' ? 'Opcional: usa el nombre del archivo' : 'Título de la actividad'} aria-invalid={!!errores.titulo} />
        </Field>
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => { setTipo(e.target.value as Tipo); setErrores({}); }}>
            {(Object.keys(ETIQUETA) as Tipo[]).map((t) => (
              <option key={t} value={t}>{ETIQUETA[t]}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="mt-3">
        {tipo === 'PDF' && <SelectorPdf archivo={archivo} onChange={setArchivo} error={errores.archivoKey} />}
        {tipo === 'VIDEO' && (
          <Field error={errores.contenido}>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" inputMode="url" aria-invalid={!!errores.contenido} aria-label="Enlace de YouTube" />
          </Field>
        )}
        {tipo === 'TEXTO' && (
          <Field error={errores.contenido}>
            <RichTextEditor key={claveEditor} onChange={(h) => setHtml(h)} error={errores.contenido} />
          </Field>
        )}
      </div>
      {errores._ && <Alert tone="error" className="mt-3">{errores._}</Alert>}
      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={enviar} loading={subiendo || crearActividad.isPending}>
          + Actividad
        </Button>
      </div>
    </div>
  );
}

/** Edición en línea de una actividad existente. */
export function ActividadEditar({ actividad, onTerminar }: { actividad: ActividadDto; onTerminar: () => void }) {
  const { editarActividad } = useModulosMutations('');
  const { toast } = useToast();
  const [titulo, setTitulo] = useState(actividad.titulo);
  const [contenido, setContenido] = useState(actividad.contenido ?? '');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [subiendo, setSubiendo] = useState(false);

  async function guardar() {
    setErrores({});
    const data: { titulo?: string; contenido?: string; archivoKey?: string } = {};
    if (!titulo.trim()) return setErrores({ titulo: 'Debe completar los campos obligatorios.' });
    data.titulo = titulo.trim();
    try {
      if (actividad.tipo === 'PDF' && archivo) {
        setSubiendo(true);
        data.archivoKey = await subirPdf(archivo);
      }
      if (actividad.tipo !== 'PDF') {
        if (!contenido.trim()) return setErrores({ contenido: 'Debe completar los campos obligatorios.' });
        data.contenido = contenido;
      }
      await editarActividad.mutateAsync({ id: actividad.id, data });
      toast('Actividad actualizada.');
      onTerminar();
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.campos).length) setErrores(e.campos);
      else setErrores({ _: mensajeDe(e) });
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="my-2 rounded-lg border border-primary bg-primary-light/60 p-3">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.5px] text-primary">Editar actividad · {actividad.tipo === 'TEXTO' ? 'Lectura' : actividad.tipo}</div>
      <div className="space-y-3">
        <Field label="Título" error={errores.titulo}>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} aria-invalid={!!errores.titulo} />
        </Field>
        {actividad.tipo === 'TEXTO' && (
          <Field label="Contenido" error={errores.contenido}>
            <RichTextEditor inicial={actividad.contenido ?? ''} onChange={(h) => setContenido(h)} error={errores.contenido} />
          </Field>
        )}
        {actividad.tipo === 'VIDEO' && (
          <Field label="Enlace de YouTube" error={errores.contenido}>
            <Input value={contenido} onChange={(e) => setContenido(e.target.value)} inputMode="url" aria-invalid={!!errores.contenido} />
          </Field>
        )}
        {actividad.tipo === 'PDF' && (
          <Field label="Archivo" error={errores.archivoKey}>
            <div className="mb-1.5 flex items-center gap-1.5 text-xs text-fg-2"><FileText className="size-3.5" aria-hidden /> Ya hay un PDF adjunto.</div>
            <SelectorPdf archivo={archivo} onChange={setArchivo} error={errores.archivoKey} actual="PDF actual" />
          </Field>
        )}
        {errores._ && <Alert tone="error">{errores._}</Alert>}
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={onTerminar}>Cancelar</Button>
          <Button size="sm" onClick={guardar} loading={subiendo || editarActividad.isPending}>Guardar cambios</Button>
        </div>
      </div>
    </div>
  );
}
