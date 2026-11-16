import { z } from 'zod';
import { MSG_CAMPOS_OBLIGATORIOS } from './errores';
import { MAX_PDF_BYTES, PDF_MIME, type EstadoCapacitacion, type TipoActividad, type TipoModulo, type TipoPregunta } from './enums';

const texto = (max: number) => z.string({ error: MSG_CAMPOS_OBLIGATORIOS }).trim().min(1, MSG_CAMPOS_OBLIGATORIOS).max(max, `Máximo ${max} caracteres.`);

/* ───────────── Módulos ───────────── */

export const moduloSchema = z.object({
  nombre: texto(120),
  tipo: z.enum(['CONTENIDO', 'TEST']).default('CONTENIDO'),
});
export type ModuloInput = z.input<typeof moduloSchema>;

export const moduloPatchSchema = z.object({ nombre: texto(120) });

export const moverModuloSchema = z.object({
  direccion: z.union([z.literal(-1), z.literal(1)], { error: 'Dirección inválida.' }),
});

/* ───────────── Actividades (antes "capítulos" del prototipo) ───────────── */

const YOUTUBE_RE = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i;
export function youtubeId(url: string): string | null {
  const m = YOUTUBE_RE.exec(url ?? '');
  return m ? m[1]! : null;
}

export const MAX_TEXTO_ACTIVIDAD = 20000;

const actividadBase = { titulo: texto(160) };

export const actividadSchema = z.discriminatedUnion(
  'tipo',
  [
    z.object({ ...actividadBase, tipo: z.literal('PDF'), archivoKey: texto(300) }),
    z.object({ ...actividadBase, tipo: z.literal('TEXTO'), contenido: texto(MAX_TEXTO_ACTIVIDAD) }),
    z.object({
      ...actividadBase,
      tipo: z.literal('VIDEO'),
      contenido: texto(300).refine((v) => youtubeId(v) !== null, 'Ingresa un enlace válido de YouTube.'),
    }),
  ],
  { error: 'Elige el tipo de actividad.' },
);
export type ActividadInput = z.infer<typeof actividadSchema>;

export const actividadPatchSchema = z.object({
  titulo: texto(160).optional(),
  contenido: texto(MAX_TEXTO_ACTIVIDAD).optional(),
  archivoKey: texto(300).optional(),
});
export type ActividadPatchInput = z.infer<typeof actividadPatchSchema>;

/** Solicitud de URL firmada de subida de PDF (Fase 2 §3.6). */
export const archivoSolicitudSchema = z.object({
  nombre: texto(200),
  tipo: z.literal(PDF_MIME, { error: 'Solo se permiten archivos PDF.' }),
  tamano: z
    .number({ error: MSG_CAMPOS_OBLIGATORIOS })
    .int()
    .min(1, 'El archivo está vacío.')
    .max(MAX_PDF_BYTES, 'El PDF debe pesar 3 MB o menos.'),
});
export type ArchivoSolicitudInput = z.infer<typeof archivoSolicitudSchema>;

export interface ArchivoSubidaDto {
  clave: string;
  url: string;
  maxBytes: number;
}

/* ───────────── Preguntas del test (pesos que suman 100 %) ───────────── */

const peso = z
  .number({ error: 'Ingresa el peso de la pregunta.' })
  .gt(0, 'El peso debe ser mayor que 0.')
  .max(100, 'El peso no puede superar 100 %.');

const preguntaBase = { texto: texto(500), peso };

export const preguntaSchema = z.discriminatedUnion(
  'tipo',
  [
    z
      .object({
        ...preguntaBase,
        tipo: z.literal('SIMPLE'),
        opciones: z
          .array(texto(200), { error: 'Ingresa al menos 2 opciones.' })
          .min(2, 'Ingresa al menos 2 opciones.')
          .max(8, 'Máximo 8 opciones.'),
        respuestaCorrecta: texto(200),
      })
      .refine((v) => v.opciones.includes(v.respuestaCorrecta), {
        path: ['respuestaCorrecta'],
        message: 'La respuesta correcta debe ser una de las opciones.',
      }),
    z.object({ ...preguntaBase, tipo: z.literal('TEXTO_LIBRE'), rubrica: texto(500) }),
    z.object({
      ...preguntaBase,
      tipo: z.literal('CUANTITATIVA'),
      valorEsperado: z.number({ error: 'Ingresa el valor esperado.' }),
      tolerancia: z.number({ error: 'Ingresa la tolerancia.' }).min(0, 'La tolerancia no puede ser negativa.').max(100, 'Máximo 100 %.'),
    }),
    z.object({ ...preguntaBase, tipo: z.literal('CUALITATIVA'), rubrica: texto(500) }),
  ],
  { error: 'Elige el tipo de pregunta.' },
);
export type PreguntaInput = z.infer<typeof preguntaSchema>;

/** Vista de la Empresa (incluye la clave de respuesta). */
export interface PreguntaEmpresaDto {
  id: string;
  moduloId: string;
  texto: string;
  tipo: TipoPregunta;
  peso: number;
  opciones?: string[];
  respuestaCorrecta?: string;
  valorEsperado?: number;
  tolerancia?: number;
  rubrica?: string;
}

export interface ActividadDto {
  id: string;
  titulo: string;
  tipo: TipoActividad;
  /** Texto enriquecido (TEXTO) o enlace (VIDEO). */
  contenido: string | null;
  archivoKey: string | null;
  /** URL firmada de lectura de corta duración (solo PDF). */
  archivoUrl: string | null;
  orden: number;
}

export interface ModuloEmpresaDto {
  id: string;
  nombre: string;
  orden: number;
  tipo: TipoModulo;
  actividades: ActividadDto[];
  preguntas: PreguntaEmpresaDto[];
  /** Suma de pesos de las preguntas propias del módulo (debe ser 100 al publicar). */
  pesoTotal: number;
  /** Solo TEST: preguntas que hereda de los módulos de contenido. */
  preguntasHeredadas: number;
}

export interface CapacitacionDetalleDto {
  id: string;
  nombre: string;
  duracion: string;
  estado: EstadoCapacitacion;
  creadoEn: string;
  modulos: ModuloEmpresaDto[];
}
