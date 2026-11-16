import { Inject, Injectable } from '@nestjs/common';
import { ENV, type Env } from '../../config/env';
import { CRITERIOS_IA, type CriterioIA, type IAProvider } from './ia-provider.interface';

const STOP = new Set(['para', 'como', 'esta', 'este', 'esto', 'unas', 'unos', 'sobre', 'entre', 'desde', 'hasta', 'cuando', 'donde', 'porque', 'pero', 'también', 'según', 'debe', 'deben', 'espera', 'evalúa', 'menciona', 'respuesta', 'razonable']);

const limitar = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const palabras = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9ñ]+/)
    .filter(Boolean);

/**
 * IA simulada y DETERMINISTA (equivalente a la IA del prototipo): evalúa
 * pertinencia (coincidencia con la rúbrica), claridad (longitud de las
 * oraciones) y profundidad (extensión) para que las pruebas sean repetibles.
 * `IA_MOCK_FALLAR=true` simula la caída del proveedor (EC-09).
 */
@Injectable()
export class MockIAProvider implements IAProvider {
  constructor(@Inject(ENV) private readonly env: Env) {}

  async calificar({ respuesta, rubrica }: { pregunta: string; respuesta: string; rubrica: string }) {
    if (this.env.ia.mockFallar) throw new Error('Servicio de IA no disponible (simulado)');

    const texto = respuesta.trim();
    const ws = palabras(texto);
    if (!ws.length) return { puntaje: 0, criterios: CRITERIOS_IA.map((nombre) => ({ nombre, puntaje: 0 })) };

    const clave = new Set(palabras(rubrica).filter((w) => w.length > 4 && !STOP.has(w)));
    const mias = new Set(ws);
    let coinciden = 0;
    clave.forEach((w) => {
      if ([...mias].some((m) => m === w || (m.length > 5 && w.startsWith(m.slice(0, 5))))) coinciden += 1;
    });
    const pertinencia = clave.size ? limitar(35 + (coinciden / clave.size) * 80) : limitar(55 + Math.min(30, ws.length));

    const oraciones = texto.split(/[.!?\n]+/).filter((s) => s.trim().length);
    const media = ws.length / Math.max(1, oraciones.length);
    const claridad = ws.length < 4 ? 25 : limitar(media >= 6 && media <= 28 ? 88 : media < 6 ? 62 : 55);

    const profundidad = limitar(28 + ws.length * 3.2);

    const criterios: CriterioIA[] = [
      { nombre: 'pertinencia', puntaje: pertinencia },
      { nombre: 'claridad', puntaje: claridad },
      { nombre: 'profundidad', puntaje: profundidad },
    ];
    return { puntaje: limitar(criterios.reduce((a, c) => a + c.puntaje, 0) / criterios.length), criterios };
  }
}
