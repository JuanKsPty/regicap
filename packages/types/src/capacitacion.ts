import { z } from 'zod';
import { MSG_CAMPOS_OBLIGATORIOS } from './errores';
import type { EstadoCapacitacion } from './enums';

/** CU-11 (Requerimiento especial): la duración estimada se expresa en semanas, entero de 1 a 52. */
export const DURACION_MIN_SEMANAS = 1;
export const DURACION_MAX_SEMANAS = 52;
export const MSG_DURACION_INVALIDA = 'La duración debe ser un número entero de semanas entre 1 y 52.';

/**
 * Normaliza lo que llega del formulario (texto del <input type="number">) o del JSON:
 * vacío → ausente (mensaje de campo obligatorio); texto numérico → número.
 * Cualquier otro texto («seis», «6 semanas») queda como NaN y se rechaza con MSG_DURACION_INVALIDA.
 */
function aSemanas(v: unknown): unknown {
  if (v === null || v === undefined) return undefined;
  if (typeof v !== 'string') return v;
  const t = v.trim();
  return t === '' ? undefined : Number(t);
}

const duracionSemanasSchema = z.preprocess(
  // El tipo de ENTRADA declarado es el del formulario; en la API llega `unknown` y se valida igual.
  aSemanas as (v: string | number) => unknown,
  z
    .number({ error: (iss) => (iss.input === undefined ? MSG_CAMPOS_OBLIGATORIOS : MSG_DURACION_INVALIDA) })
    .int(MSG_DURACION_INVALIDA)
    .min(DURACION_MIN_SEMANAS, MSG_DURACION_INVALIDA)
    .max(DURACION_MAX_SEMANAS, MSG_DURACION_INVALIDA),
);

/** Esquema único del formulario (web) y del ValidationPipe (API) — Fase 2 §7.3. */
export const capacitacionSchema = z.object({
  nombre: z.string({ error: MSG_CAMPOS_OBLIGATORIOS }).trim().min(1, MSG_CAMPOS_OBLIGATORIOS).max(120),
  duracion: duracionSemanasSchema,
});
/** Datos ya validados: `duracion` es el nº de semanas (entero 1–52). */
export type CapacitacionInput = z.output<typeof capacitacionSchema>;
/** Valores del formulario antes de validar (el campo numérico entrega texto). */
export type CapacitacionFormValues = z.input<typeof capacitacionSchema>;

export const capacitacionPatchSchema = capacitacionSchema.partial().refine((v) => v.nombre !== undefined || v.duracion !== undefined, {
  message: MSG_CAMPOS_OBLIGATORIOS,
});
export type CapacitacionPatchInput = z.output<typeof capacitacionPatchSchema>;

/**
 * La columna `capacitacion.duracion` sigue siendo texto (VARCHAR 40): se guarda y se
 * muestra como «N semanas», igual que los datos existentes («6 semanas»).
 */
export function formatearDuracion(semanas: number): string {
  return `${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`;
}

/**
 * Nº de semanas de una duración guardada («6 semanas», «1 semana», «2») o `null`
 * si es un texto heredado sin número válido («Por definir»).
 */
export function semanasDeDuracion(duracion: string): number | null {
  const m = /^\s*(\d{1,2})(?:\s*semanas?)?\s*$/i.exec(duracion);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= DURACION_MIN_SEMANAS && n <= DURACION_MAX_SEMANAS ? n : null;
}

export interface CapacitacionDto {
  id: string;
  nombre: string;
  /** Texto para mostrar: «N semanas» (o un valor heredado como «Por definir»). */
  duracion: string;
  estado: EstadoCapacitacion;
  modulos: number;
  creadoEn: string;
}
