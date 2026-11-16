import { z } from 'zod';
import { MSG_CAMPOS_OBLIGATORIOS } from './errores';
import type { EstadoInscripcion, Nivel } from './enums';
import { ESTADOS_INSCRIPCION } from './enums';

/* ───────────── CU-08 Consultar resultados ───────────── */

export const filtrosResultadosSchema = z.object({
  capacitacionId: z.string().uuid().optional(),
  participanteId: z.string().uuid().optional(),
  /** Cohorte semestral: "2026-A" (ene–jun) o "2026-B" (jul–dic). */
  cohorte: z
    .string()
    .regex(/^\d{4}-[AB]$/, 'Cohorte inválida (ej. 2026-A).')
    .optional(),
  /** Período por fecha de inscripción (YYYY-MM-DD). */
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida.').optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida.').optional(),
  estado: z.enum(ESTADOS_INSCRIPCION).optional(),
});
export type FiltrosResultados = z.infer<typeof filtrosResultadosSchema>;

export interface FilaResultadoDto {
  inscripcionId: string;
  participanteId: string;
  participante: string;
  capacitacionId: string;
  capacitacion: string;
  estado: EstadoInscripcion;
  cohorte: string;
  fechaInscripcion: string;
  puntaje: number | null;
  nivel: Nivel | null;
  modulosEnviados: number;
  modulosTotal: number;
}

export interface BarraCapacitacionDto {
  capacitacionId: string;
  nombre: string;
  puntaje: number | null;
  participantes: number;
}

export interface DistribucionDto {
  alto: number;
  medio: number;
  bajo: number;
  total: number;
}

export interface ResultadosDto {
  metricas: {
    participantes: number;
    puntajePromedio: number | null;
    tasaCompletitud: number;
    rendimientoAlto: number;
  };
  porCapacitacion: BarraCapacitacionDto[];
  capacitacionMasDebil: { id: string; nombre: string; puntaje: number } | null;
  distribucion: DistribucionDto;
  filas: FilaResultadoDto[];
  /** Calificaciones en ERROR que el administrador puede reencolar. */
  calificacionesConError: number;
  calificacionesPendientes: number;
  /** Opciones para poblar los filtros. */
  opciones: {
    capacitaciones: { id: string; nombre: string }[];
    participantes: { id: string; nombre: string }[];
    cohortes: string[];
  };
}

export interface ModuloResultadoDto {
  moduloId: string;
  nombre: string;
  orden: number;
  puntaje: number | null;
  respuestas: number;
}

export interface DetalleCapacitacionDto {
  capacitacionId: string;
  nombre: string;
  empresa: string;
  modulos: ModuloResultadoDto[];
  participantes: FilaResultadoDto[];
}

export interface AnalisisModuloDto {
  moduloId: string;
  nombre: string;
  orden: number;
  enviado: boolean;
  puntaje: number | null;
  nivel: Nivel | null;
  criterioMasBajo: string | null;
  pendienteCalificacion: boolean;
}

export interface AnalisisParticipanteDto {
  participanteId: string;
  nombre: string;
  email: string;
  promedio: number | null;
  nivel: Nivel | null;
  inscripciones: number;
  completadas: number;
  porCapacitacion: {
    capacitacionId: string;
    nombre: string;
    estado: EstadoInscripcion;
    puntaje: number | null;
    modulos: AnalisisModuloDto[];
  }[];
  aReforzar: { criterio: string; modulos: number }[];
}

/* ───────────── CU-09 Analizar resultados ───────────── */

export interface CohorteEvolucionDto {
  periodo: string;
  puntajePromedio: number | null;
  participantes: number;
  actual: boolean;
}

export type TipoDecision = 'info' | 'warning' | 'success';

export interface DecisionDto {
  clave: string;
  tipo: TipoDecision;
  texto: string;
  aplicada: boolean;
}

export interface AnalisisDto {
  cohorteActual: string;
  actualizadoEn: string;
  metricas: {
    totalInscritos: number;
    tasaParticipacion: number;
    capacitacionMasDebil: { id: string; nombre: string; puntaje: number } | null;
    capacitacionMasFuerte: { id: string; nombre: string; puntaje: number } | null;
  };
  evolucion: CohorteEvolucionDto[];
  decisiones: DecisionDto[];
  distribucion: DistribucionDto;
}

/* ───────────── CU-10 Entregar feedback ───────────── */

export const feedbackSchema = z.object({
  participanteId: z.string({ error: MSG_CAMPOS_OBLIGATORIOS }).uuid('Participante inválido.'),
  capacitacionId: z.string({ error: MSG_CAMPOS_OBLIGATORIOS }).uuid('Capacitación inválida.'),
  texto: z.string({ error: MSG_CAMPOS_OBLIGATORIOS }).trim().min(1, MSG_CAMPOS_OBLIGATORIOS).max(2000, 'Máximo 2000 caracteres.'),
});
export type FeedbackInput = z.infer<typeof feedbackSchema>;

export interface FeedbackParticipanteResumenDto {
  participanteId: string;
  nombre: string;
  inscripciones: number;
  peorPuntaje: number | null;
  peorNivel: Nivel | null;
  peorCapacitacionId: string | null;
  feedbacks: number;
}

export interface FeedbackListadoDto {
  participantes: FeedbackParticipanteResumenDto[];
  bajoRendimiento: number;
}

export interface FeedbackContextoDto {
  participanteId: string;
  nombre: string;
  capacitaciones: { id: string; nombre: string }[];
  capacitacionId: string | null;
  /** Última respuesta enviada y clasificada por la IA en esa capacitación. */
  respuesta: {
    modulo: string;
    texto: string;
    puntaje: number | null;
    nivel: Nivel | null;
    criterioMasBajo: string | null;
    pendienteCalificacion: boolean;
  } | null;
  puntajeCapacitacion: number | null;
  historial: { id: string; texto: string; fecha: string }[];
}
