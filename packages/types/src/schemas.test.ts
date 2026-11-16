import { describe, expect, it } from 'vitest';
import {
  actividadSchema,
  capacitacionSchema,
  cohorteDe,
  nivelDesdePuntaje,
  preguntaSchema,
  rangoCohorte,
  registroSchema,
  youtubeId,
} from './index';

describe('capacitacionSchema (EC-07: mensaje junto al campo)', () => {
  it('acepta nombre y duración válidos y recorta espacios', () => {
    const r = capacitacionSchema.parse({ nombre: '  Ventas  ', duracion: ' 6 semanas ' });
    expect(r).toEqual({ nombre: 'Ventas', duracion: '6 semanas' });
  });
  it('rechaza campos vacíos con el literal de la Fase 1', () => {
    const r = capacitacionSchema.safeParse({ nombre: '   ', duracion: '' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message);
      expect(msgs).toContain('Debe completar los campos obligatorios.');
    }
  });
});

describe('nivelDesdePuntaje', () => {
  it.each([
    [100, 'ALTO'],
    [80, 'ALTO'],
    [79, 'MEDIO'],
    [60, 'MEDIO'],
    [59, 'BAJO'],
    [0, 'BAJO'],
  ])('%i → %s', (p, n) => expect(nivelDesdePuntaje(p)).toBe(n));
});

describe('cohortes', () => {
  it('semestre A/B', () => {
    expect(cohorteDe('2026-03-10T00:00:00Z')).toBe('2026-A');
    expect(cohorteDe('2026-07-01T00:00:00Z')).toBe('2026-B');
  });
  it('rango', () => {
    const r = rangoCohorte('2026-B');
    expect(r.desde.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(r.hasta.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});

describe('actividadSchema', () => {
  it('valida enlace de YouTube', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=qEE0s9cnj34')).toBe('qEE0s9cnj34');
    expect(youtubeId('https://youtu.be/qEE0s9cnj34')).toBe('qEE0s9cnj34');
    expect(youtubeId('https://vimeo.com/123')).toBeNull();
    expect(actividadSchema.safeParse({ tipo: 'VIDEO', titulo: 'v', contenido: 'https://vimeo.com/1' }).success).toBe(false);
  });
});

describe('preguntaSchema', () => {
  it('la respuesta correcta debe estar entre las opciones', () => {
    const base = { tipo: 'SIMPLE', texto: '¿?', peso: 50, opciones: ['a', 'b'] };
    expect(preguntaSchema.safeParse({ ...base, respuestaCorrecta: 'c' }).success).toBe(false);
    expect(preguntaSchema.safeParse({ ...base, respuestaCorrecta: 'a' }).success).toBe(true);
  });
  it('peso entre 0 y 100', () => {
    expect(preguntaSchema.safeParse({ tipo: 'CUALITATIVA', texto: 'x', peso: 120, rubrica: 'r' }).success).toBe(false);
  });
});

describe('registroSchema', () => {
  it('la Empresa exige nombre de organización', () => {
    const r = registroSchema.safeParse({ rol: 'EMPRESA', nombre: 'Ana', email: 'a@b.co', password: '12345678' });
    expect(r.success).toBe(false);
  });
  it('el Participante no exige organización', () => {
    expect(registroSchema.safeParse({ rol: 'PARTICIPANTE', nombre: 'Ana', email: 'A@B.co', password: '12345678' }).success).toBe(true);
  });
});
