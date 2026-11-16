import { z } from 'zod';

/** Enumeraciones compartidas (coinciden con los enums de Prisma). */

export const ROLES = ['PARTICIPANTE', 'EMPRESA', 'ADMINISTRADOR'] as const;
export type Rol = (typeof ROLES)[number];

export const ESTADOS_CAPACITACION = ['BORRADOR', 'PUBLICADA'] as const;
export type EstadoCapacitacion = (typeof ESTADOS_CAPACITACION)[number];

export const ESTADOS_INSCRIPCION = ['PENDIENTE', 'EN_CURSO', 'COMPLETADA', 'CANCELADA'] as const;
export type EstadoInscripcion = (typeof ESTADOS_INSCRIPCION)[number];

export const TIPOS_MODULO = ['CONTENIDO', 'TEST'] as const;
export type TipoModulo = (typeof TIPOS_MODULO)[number];

export const TIPOS_ACTIVIDAD = ['PDF', 'TEXTO', 'VIDEO'] as const;
export type TipoActividad = (typeof TIPOS_ACTIVIDAD)[number];

export const TIPOS_PREGUNTA = ['SIMPLE', 'TEXTO_LIBRE', 'CUANTITATIVA', 'CUALITATIVA'] as const;
export type TipoPregunta = (typeof TIPOS_PREGUNTA)[number];

export const ESTADOS_RESPUESTA = ['BORRADOR', 'ENVIADA'] as const;
export type EstadoRespuesta = (typeof ESTADOS_RESPUESTA)[number];

export const ESTADOS_CALIFICACION = ['PENDIENTE', 'CALIFICADA', 'ERROR'] as const;
export type EstadoCalificacion = (typeof ESTADOS_CALIFICACION)[number];

export const NIVELES = ['ALTO', 'MEDIO', 'BAJO'] as const;
export type Nivel = (typeof NIVELES)[number];

export const ESTADOS_MODULO = ['POR_RESOLVER', 'BORRADOR', 'ENVIADO'] as const;
export type EstadoModulo = (typeof ESTADOS_MODULO)[number];

export const TIPOS_EMPRESA = ['cámara', 'banco', 'plataforma', 'universidad', 'gobierno', 'otro'] as const;
export type TipoEmpresa = (typeof TIPOS_EMPRESA)[number];

export const rolSchema = z.enum(ROLES);

/** Límite de tamaño de los PDF (decisión pendiente de la Fase 1, validada en la Fase 2 §3.6). */
export const MAX_PDF_BYTES = 3 * 1024 * 1024;
export const PDF_MIME = 'application/pdf';
/** Tamaño de página del catálogo (RNF-05). */
export const CATALOGO_PAGE_SIZE = 12;
