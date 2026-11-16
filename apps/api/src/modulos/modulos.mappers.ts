import type { Actividad, Pregunta } from '@regicap/db';
import type { ActividadDto, PreguntaEmpresaDto, PreguntaParticipanteDto, PreguntaInput } from '@regicap/types';

export interface ConfigSimple {
  opciones: string[];
  respuestaCorrecta: string;
}
export interface ConfigCuantitativa {
  valorEsperado: number;
  tolerancia: number;
}

/** Convierte la pregunta validada del DTO a (configuracion, rubrica) para la BD. */
export function configDePregunta(p: PreguntaInput): { configuracion: object | null; rubrica: string | null } {
  switch (p.tipo) {
    case 'SIMPLE':
      return { configuracion: { opciones: p.opciones, respuestaCorrecta: p.respuestaCorrecta } satisfies ConfigSimple, rubrica: null };
    case 'CUANTITATIVA':
      return { configuracion: { valorEsperado: p.valorEsperado, tolerancia: p.tolerancia } satisfies ConfigCuantitativa, rubrica: null };
    default:
      return { configuracion: null, rubrica: p.rubrica };
  }
}

export function aPreguntaEmpresaDto(p: Pregunta): PreguntaEmpresaDto {
  const base: PreguntaEmpresaDto = { id: p.id, moduloId: p.moduloId, texto: p.texto, tipo: p.tipo, peso: Number(p.peso) };
  if (p.tipo === 'SIMPLE') {
    const c = p.configuracion as unknown as ConfigSimple;
    return { ...base, opciones: c.opciones, respuestaCorrecta: c.respuestaCorrecta };
  }
  if (p.tipo === 'CUANTITATIVA') {
    const c = p.configuracion as unknown as ConfigCuantitativa;
    return { ...base, valorEsperado: c.valorEsperado, tolerancia: c.tolerancia };
  }
  return { ...base, rubrica: p.rubrica ?? '' };
}

/** El Participante NUNCA recibe la clave de respuesta ni la rúbrica. */
export function aPreguntaParticipanteDto(p: Pregunta, moduloNombre?: string): PreguntaParticipanteDto {
  const base: PreguntaParticipanteDto = { id: p.id, texto: p.texto, tipo: p.tipo, peso: Number(p.peso), moduloNombre };
  if (p.tipo === 'SIMPLE') return { ...base, opciones: (p.configuracion as unknown as ConfigSimple).opciones };
  return base;
}

export function aActividadDto(a: Actividad, archivoUrl: string | null): ActividadDto {
  return {
    id: a.id,
    titulo: a.titulo,
    tipo: a.tipo,
    contenido: a.tipo === 'PDF' ? null : a.contenido,
    archivoKey: a.archivoKey,
    archivoUrl,
    orden: a.orden,
  };
}
