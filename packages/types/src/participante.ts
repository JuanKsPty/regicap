import { z } from 'zod';
import { MSG_CAMPOS_OBLIGATORIOS } from './errores';
import type {
  EstadoCalificacion,
  EstadoInscripcion,
  EstadoModulo,
  Nivel,
  TipoModulo,
  TipoPregunta,
} from './enums';
import type { ActividadDto } from './modulo';

/* ───────────── CU-03 Administrar capacitaciones ───────────── */

export const inscribirseSchema = z.object({
  capacitacionId: z.string({ error: MSG_CAMPOS_OBLIGATORIOS }).uuid('Capacitación inválida.'),
});
export type InscribirseInput = z.infer<typeof inscribirseSchema>;

export const vistaInscripcionesSchema = z.enum(['activas', 'historial']).default('activas');
export type VistaInscripciones = z.infer<typeof vistaInscripcionesSchema>;

export interface InscripcionDto {
  id: string;
  capacitacionId: string;
  titulo: string;
  empresa: string;
  estado: EstadoInscripcion;
  fechaInscripcion: string;
  /** Porcentaje de módulos enviados (calculado, no almacenado — D-11). */
  progreso: number;
}

export interface ResumenInscripcionesDto {
  matriculadas: number;
  pendientes: number;
  completadas: number;
}

export interface InscripcionesRespuestaDto {
  resumen: ResumenInscripcionesDto;
  inscripciones: InscripcionDto[];
}

export interface CatalogoItemDto {
  capacitacionId: string;
  titulo: string;
  empresa: string;
  modulos: number;
  duracion: string;
}

export interface CatalogoDto {
  items: CatalogoItemDto[];
  total: number;
  page: number;
  pageSize: number;
}

/* ───────────── CU-04 Tomar capacitaciones ───────────── */

export interface ProgresoDto {
  inscripcionId: string;
  titulo: string;
  empresa: string;
  estado: EstadoInscripcion;
  enviados: number;
  total: number;
  porcentaje: number;
}

export interface ModuloEstadoDto {
  id: string;
  titulo: string;
  orden: number;
  tipo: TipoModulo;
  actividades: number;
  preguntas: number;
  tieneTest: boolean;
  estado: EstadoModulo;
  puntaje: number | null;
  nivel: Nivel | null;
  pendienteCalificacion: boolean;
}

/* ───────────── CU-05 Resolver módulos ───────────── */

/** Pregunta tal como la ve el Participante (sin clave de respuesta). */
export interface PreguntaParticipanteDto {
  id: string;
  texto: string;
  tipo: TipoPregunta;
  peso: number;
  opciones?: string[];
  /** Módulo de origen (para agrupar la evaluación final). */
  moduloNombre?: string;
}

export const contenidoRespuestaSchema = z.object({
  reflexion: z
    .object({
      aprendido: z.string().max(4000, 'Máximo 4000 caracteres.').default(''),
      aplicacion: z.string().max(4000, 'Máximo 4000 caracteres.').default(''),
    })
    .optional(),
  examen: z
    .array(
      z.object({
        preguntaId: z.string().uuid(),
        valor: z.string().max(4000, 'Máximo 4000 caracteres.'),
      }),
    )
    .default([]),
});
export type ContenidoRespuesta = z.infer<typeof contenidoRespuestaSchema>;

export interface ModuloDetalleDto {
  id: string;
  inscripcionId: string;
  capacitacionNombre: string;
  empresa: string;
  nombre: string;
  orden: number;
  tipo: TipoModulo;
  actividades: ActividadDto[];
  preguntas: PreguntaParticipanteDto[];
  /** Respuesta previa (borrador o enviada). */
  respuesta: ContenidoRespuesta | null;
  estado: EstadoModulo;
  calificacion: {
    estado: EstadoCalificacion;
    puntaje: number | null;
    nivel: Nivel | null;
    criterioMasBajo: string | null;
  } | null;
  /** Texto "Pendiente de calificación" cuando la IA aún no responde o falló. */
  pendienteCalificacion: boolean;
}

/* ───────────── CU-06 Recibir feedback ───────────── */

export interface FeedbackItemDto {
  id: string;
  texto: string;
  fecha: string;
  administrador: string;
}

export interface FeedbackCapacitacionDto {
  capacitacionId: string;
  titulo: string;
  empresa: string;
  estadoInscripcion: EstadoInscripcion | null;
  puntaje: number | null;
  nivel: Nivel | null;
  items: FeedbackItemDto[];
}

export interface FeedbackParticipanteDto {
  total: number;
  capacitaciones: number;
  ultimo: string | null;
  grupos: FeedbackCapacitacionDto[];
}
