import { describe, expect, it } from 'vitest';
import {
  actividadSchema,
  capacitacionPatchSchema,
  capacitacionSchema,
  cohorteDe,
  formatearDuracion,
  MSG_CU03_CATALOGO_VACIO,
  MSG_CU03_HISTORIAL_VACIO,
  MSG_CU03_SIN_ACTIVAS,
  MSG_CU04_SIN_ACTIVAS,
  nivelDesdePuntaje,
  preguntaSchema,
  rangoCohorte,
  registroSchema,
  semanasDeDuracion,
  youtubeId,
} from './index';

const MSG_DURACION = 'La duración debe ser un número entero de semanas entre 1 y 52.';
const MSG_OBLIGATORIOS = 'Debe completar los campos obligatorios.';
const mensajesDe = (r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }, campo: string) =>
  (r.error?.issues ?? []).filter((i) => i.path[0] === campo).map((i) => i.message);

describe('capacitacionSchema (EC-07: mensaje junto al campo)', () => {
  it('acepta nombre y duración válidos y recorta espacios', () => {
    const r = capacitacionSchema.parse({ nombre: '  Ventas  ', duracion: ' 6 ' });
    expect(r).toEqual({ nombre: 'Ventas', duracion: 6 });
  });
  it('rechaza campos vacíos con el literal de la Fase 1', () => {
    const r = capacitacionSchema.safeParse({ nombre: '   ', duracion: '' });
    expect(r.success).toBe(false);
    expect(mensajesDe(r, 'nombre')).toEqual([MSG_OBLIGATORIOS]);
    expect(mensajesDe(r, 'duracion')).toEqual([MSG_OBLIGATORIOS]);
  });
  it('duración ausente o null → campo obligatorio', () => {
    expect(mensajesDe(capacitacionSchema.safeParse({ nombre: 'Ventas' }), 'duracion')).toEqual([MSG_OBLIGATORIOS]);
    expect(mensajesDe(capacitacionSchema.safeParse({ nombre: 'Ventas', duracion: null }), 'duracion')).toEqual([MSG_OBLIGATORIOS]);
  });
});

describe('capacitacionSchema.duracion (D-2: semanas, entero de 1 a 52)', () => {
  it.each([
    [1, 1],
    [52, 52],
    ['1', 1],
    ['52', 52],
    [' 12 ', 12],
  ])('acepta %j → %i', (entrada, esperado) => {
    expect(capacitacionSchema.parse({ nombre: 'Ventas', duracion: entrada }).duracion).toBe(esperado);
  });
  it.each([[0], [53], [-3], [2.5], ['0'], ['53'], ['2.5'], ['seis'], ['6 semanas'], ['Por definir'], [Number.NaN], [true]])(
    'rechaza %j con el mensaje de rango junto al campo',
    (entrada) => {
      const r = capacitacionSchema.safeParse({ nombre: 'Ventas', duracion: entrada });
      expect(r.success).toBe(false);
      expect(mensajesDe(r, 'duracion')).toEqual([MSG_DURACION]);
      expect(mensajesDe(r, 'nombre')).toEqual([]);
    },
  );
});

describe('capacitacionPatchSchema (D-2 también al editar)', () => {
  it('permite cambiar solo el nombre o solo la duración', () => {
    expect(capacitacionPatchSchema.parse({ nombre: ' Ventas ' })).toEqual({ nombre: 'Ventas' });
    expect(capacitacionPatchSchema.parse({ duracion: '8' })).toEqual({ duracion: 8 });
  });
  it.each([[0], [53], ['8 semanas'], [1.5]])('rechaza duración %j', (entrada) => {
    const r = capacitacionPatchSchema.safeParse({ duracion: entrada });
    expect(r.success).toBe(false);
    expect(mensajesDe(r, 'duracion')).toEqual([MSG_DURACION]);
  });
  it('duración vacía → campo obligatorio', () => {
    expect(mensajesDe(capacitacionPatchSchema.safeParse({ nombre: 'Ventas', duracion: '' }), 'duracion')).toEqual([MSG_OBLIGATORIOS]);
  });
  it('cuerpo vacío → campos obligatorios', () => {
    const r = capacitacionPatchSchema.safeParse({});
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.message)).toEqual([MSG_OBLIGATORIOS]);
  });
});

describe('duración guardada como texto «N semanas» (sin migración)', () => {
  it('formatearDuracion', () => {
    expect(formatearDuracion(1)).toBe('1 semana');
    expect(formatearDuracion(6)).toBe('6 semanas');
    expect(formatearDuracion(52)).toBe('52 semanas');
  });
  it.each([
    ['6 semanas', 6],
    ['1 semana', 1],
    ['10 Semanas', 10],
    ['2', 2],
    ['Por definir', null],
    ['0 semanas', null],
    ['53 semanas', null],
    ['6 meses', null],
    ['', null],
  ])('semanasDeDuracion(%j) → %j', (texto, n) => expect(semanasDeDuracion(texto)).toBe(n));
  it('ida y vuelta', () => {
    for (let n = 1; n <= 52; n++) expect(semanasDeDuracion(formatearDuracion(n))).toBe(n);
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

describe('Mensajes de los estados vacíos (literales de la Fase 1, defecto D-3)', () => {
  it('CU-03 FE-1, FE-2 y FE-3 y CU-04 FE-1 usan el texto exacto de la especificación', () => {
    expect(MSG_CU03_SIN_ACTIVAS).toBe('No tienes capacitaciones activas. Explora el catálogo abajo.');
    expect(MSG_CU03_CATALOGO_VACIO).toBe('No hay capacitaciones disponibles en este momento.');
    expect(MSG_CU03_HISTORIAL_VACIO).toBe('Aún no tienes capacitaciones en tu historial.');
    expect(MSG_CU04_SIN_ACTIVAS).toBe('No tienes capacitaciones activas. Inscríbete desde Administrar Capacitaciones.');
  });
});
