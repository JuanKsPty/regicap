import { z } from 'zod';
import { MSG_CAMPOS_OBLIGATORIOS } from './errores';
import type { EstadoCapacitacion } from './enums';

/** Esquema único del formulario (web) y del ValidationPipe (API) — Fase 2 §7.3. */
export const capacitacionSchema = z.object({
  nombre: z.string({ error: MSG_CAMPOS_OBLIGATORIOS }).trim().min(1, MSG_CAMPOS_OBLIGATORIOS).max(120),
  duracion: z.string({ error: MSG_CAMPOS_OBLIGATORIOS }).trim().min(1, MSG_CAMPOS_OBLIGATORIOS).max(40),
});
export type CapacitacionInput = z.infer<typeof capacitacionSchema>;

export const capacitacionPatchSchema = capacitacionSchema.partial().refine((v) => v.nombre !== undefined || v.duracion !== undefined, {
  message: MSG_CAMPOS_OBLIGATORIOS,
});
export type CapacitacionPatchInput = z.infer<typeof capacitacionPatchSchema>;

export interface CapacitacionDto {
  id: string;
  nombre: string;
  duracion: string;
  estado: EstadoCapacitacion;
  modulos: number;
  creadoEn: string;
}
