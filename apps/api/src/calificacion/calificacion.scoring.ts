import { nivelDesdePuntaje, type ContenidoRespuesta, type Nivel, type TipoPregunta } from '@regicap/types';
import type { CriterioIA, IAProvider } from './ia/ia-provider.interface';

/** Pregunta con todo lo necesario para calificarla (incluye la clave: solo vive en el servidor). */
export interface PreguntaCalificable {
  id: string;
  texto: string;
  tipo: TipoPregunta;
  peso: number;
  configuracion: unknown;
  rubrica: string | null;
}

export interface ResultadoPregunta {
  preguntaId: string;
  texto: string;
  tipo: TipoPregunta;
  peso: number;
  puntaje: number;
  criterios?: CriterioIA[];
}

export interface ResultadoModulo {
  puntaje: number;
  nivel: Nivel;
  criterioMasBajo: string | null;
  detalle: ResultadoPregunta[];
}

const limitar = (n: number) => Math.max(0, Math.min(100, n));

/** SIMPLE: comparación con la clave → 100 si coincide, 0 si no. */
export function puntajeSimple(respuesta: string, correcta: string): number {
  return respuesta.trim().toLowerCase() === correcta.trim().toLowerCase() ? 100 : 0;
}

/**
 * CUANTITATIVA: validación contra el valor esperado con margen de tolerancia (%).
 * Dentro de la tolerancia → 100; fuera, el puntaje decrece proporcionalmente al
 * error hasta un mínimo de 0.
 */
export function puntajeCuantitativa(respuesta: string, esperado: number, toleranciaPct: number): number {
  const v = Number(respuesta.trim().replace(',', '.'));
  if (respuesta.trim() === '' || Number.isNaN(v)) return 0;
  const errorPct = esperado === 0 ? Math.abs(v) * 100 : (Math.abs(v - esperado) / Math.abs(esperado)) * 100;
  if (errorPct <= toleranciaPct) return 100;
  return limitar(100 - (errorPct - toleranciaPct) * 2);
}

/** Σ(peso_i × puntaje_i) / Σ(peso_i) */
export function agregarPonderado(items: { peso: number; puntaje: number }[]): number {
  const suma = items.reduce((a, i) => a + i.peso, 0);
  if (suma <= 0) return 0;
  return items.reduce((a, i) => a + i.peso * i.puntaje, 0) / suma;
}

/** Criterio con menor promedio entre las preguntas abiertas; si no hay, el enunciado de la pregunta más floja. */
export function criterioMasBajo(detalle: ResultadoPregunta[], puntajeModulo: number): string | null {
  const acum = new Map<string, { suma: number; n: number }>();
  for (const d of detalle) {
    for (const c of d.criterios ?? []) {
      const a = acum.get(c.nombre) ?? { suma: 0, n: 0 };
      a.suma += c.puntaje;
      a.n += 1;
      acum.set(c.nombre, a);
    }
  }
  if (acum.size) {
    const [nombre, a] = [...acum.entries()].map(([k, v]) => [k, v.suma / v.n] as const).sort((x, y) => x[1] - y[1])[0]!;
    return a < 90 ? nombre : null;
  }
  const peor = [...detalle].sort((x, y) => x.puntaje - y.puntaje)[0];
  return peor && peor.puntaje < 90 && puntajeModulo < 90 ? peor.texto.slice(0, 120) : null;
}

const RUBRICA_REFLEXION = 'Se espera pertinencia, claridad y profundidad respecto al contenido del módulo';

/**
 * Califica un módulo (CU-07): tipifica cada pregunta, puntúa según su tipo
 * (determinista o vía IAProvider) y agrega con los pesos de la Empresa.
 * Si el módulo no tiene test, se califica la reflexión como texto libre.
 */
export async function calificarModulo(
  preguntas: PreguntaCalificable[],
  contenido: ContenidoRespuesta,
  ia: IAProvider,
): Promise<ResultadoModulo> {
  const detalle: ResultadoPregunta[] = [];

  if (!preguntas.length) {
    const texto = [contenido.reflexion?.aprendido, contenido.reflexion?.aplicacion].filter(Boolean).join('\n').trim();
    const r = await ia.calificar({ pregunta: 'Reflexión sobre lo aprendido y su aplicación', respuesta: texto, rubrica: RUBRICA_REFLEXION });
    detalle.push({ preguntaId: 'reflexion', texto: 'Reflexión del módulo', tipo: 'TEXTO_LIBRE', peso: 100, puntaje: limitar(r.puntaje), criterios: r.criterios });
  } else {
    const respuestas = new Map(contenido.examen.map((e) => [e.preguntaId, e.valor]));
    for (const p of preguntas) {
      const valor = respuestas.get(p.id) ?? '';
      let puntaje = 0;
      let criterios: CriterioIA[] | undefined;
      if (p.tipo === 'SIMPLE') {
        puntaje = puntajeSimple(valor, (p.configuracion as { respuestaCorrecta: string }).respuestaCorrecta);
      } else if (p.tipo === 'CUANTITATIVA') {
        const c = p.configuracion as { valorEsperado: number; tolerancia: number };
        puntaje = puntajeCuantitativa(valor, c.valorEsperado, c.tolerancia);
      } else {
        const r = await ia.calificar({ pregunta: p.texto, respuesta: valor, rubrica: p.rubrica ?? '' });
        puntaje = limitar(r.puntaje);
        criterios = r.criterios;
      }
      detalle.push({ preguntaId: p.id, texto: p.texto, tipo: p.tipo, peso: p.peso, puntaje, criterios });
    }
  }

  const puntaje = Math.round(agregarPonderado(detalle));
  return { puntaje, nivel: nivelDesdePuntaje(puntaje), criterioMasBajo: criterioMasBajo(detalle, puntaje), detalle };
}
