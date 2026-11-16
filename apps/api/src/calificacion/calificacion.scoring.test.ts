import { describe, expect, it } from 'vitest';
import { agregarPonderado, calificarModulo, puntajeCuantitativa, puntajeSimple, type PreguntaCalificable } from './calificacion.scoring';
import type { IAProvider } from './ia/ia-provider.interface';

const iaFija = (puntaje: number): IAProvider => ({
  calificar: async () => ({
    puntaje,
    criterios: [
      { nombre: 'pertinencia', puntaje: 90 },
      { nombre: 'claridad', puntaje: 40 },
      { nombre: 'profundidad', puntaje: 80 },
    ],
  }),
});

describe('puntajeSimple', () => {
  it('compara con la clave sin distinguir mayúsculas ni espacios', () => {
    expect(puntajeSimple(' 32 BITS ', '32 bits')).toBe(100);
    expect(puntajeSimple('16 bits', '32 bits')).toBe(0);
  });
});

describe('puntajeCuantitativa', () => {
  it('100 dentro de la tolerancia', () => expect(puntajeCuantitativa('520', 500, 15)).toBe(100));
  it('decrece fuera de la tolerancia', () => expect(puntajeCuantitativa('650', 500, 15)).toBe(70)); // error 30 %, 15 sobre la tolerancia ×2
  it('mínimo 0', () => expect(puntajeCuantitativa('5000', 500, 10)).toBe(0));
  it('no numérico → 0', () => expect(puntajeCuantitativa('abc', 500, 10)).toBe(0));
  it('acepta coma decimal', () => expect(puntajeCuantitativa('8,0', 8, 0)).toBe(100));
});

describe('agregarPonderado', () => {
  it('Σ(peso × puntaje) / Σ(peso)', () => {
    expect(agregarPonderado([{ peso: 40, puntaje: 100 }, { peso: 60, puntaje: 50 }])).toBe(70);
  });
});

describe('calificarModulo', () => {
  const preguntas: PreguntaCalificable[] = [
    { id: 'a', texto: '¿Bits IPv4?', tipo: 'SIMPLE', peso: 50, configuracion: { opciones: ['16', '32'], respuestaCorrecta: '32' }, rubrica: null },
    { id: 'b', texto: 'Explica la máscara', tipo: 'TEXTO_LIBRE', peso: 50, configuracion: null, rubrica: 'red y host' },
  ];

  it('combina preguntas deterministas y de IA con los pesos de la Empresa', async () => {
    const r = await calificarModulo(preguntas, { examen: [{ preguntaId: 'a', valor: '32' }, { preguntaId: 'b', valor: 'algo' }] }, iaFija(60));
    expect(r.puntaje).toBe(80); // (100×50 + 60×50) / 100
    expect(r.nivel).toBe('ALTO');
    expect(r.criterioMasBajo).toBe('claridad');
  });

  it('una pregunta sin responder puntúa 0', async () => {
    const r = await calificarModulo(preguntas.slice(0, 1), { examen: [] }, iaFija(60));
    expect(r.puntaje).toBe(0);
    expect(r.nivel).toBe('BAJO');
  });

  it('sin test califica la reflexión', async () => {
    const r = await calificarModulo([], { reflexion: { aprendido: 'x', aplicacion: 'y' }, examen: [] }, iaFija(72));
    expect(r.puntaje).toBe(72);
    expect(r.nivel).toBe('MEDIO');
  });

  it('propaga el fallo del proveedor (BullMQ reintenta)', async () => {
    const mala: IAProvider = { calificar: async () => { throw new Error('caída'); } };
    await expect(calificarModulo(preguntas, { examen: [] }, mala)).rejects.toThrow('caída');
  });
});
