import { describe, expect, it } from 'vitest';
import { Capacitacion, MSG_SIN_MODULOS } from './capacitacion.entity';

describe('Capacitacion.motivoNoPublicable (CU-11 FA-2)', () => {
  it('D-1: sin módulos NO se puede publicar', () => {
    expect(Capacitacion.motivoNoPublicable(0, [])).toBe('Agrega al menos un módulo antes de publicar.');
    expect(MSG_SIN_MODULOS).toBe('Agrega al menos un módulo antes de publicar.');
  });
  it('con módulos y sin tests (solo actividades) se puede publicar', () => {
    expect(Capacitacion.motivoNoPublicable(2, [])).toBeNull();
  });
  it('con todos los tests en 100 % se puede publicar', () => {
    expect(Capacitacion.motivoNoPublicable(2, [{ nombre: 'A', peso: 100 }, { nombre: 'B', peso: 100.004 }])).toBeNull();
  });
  it('RF-06: lista los módulos cuyo test no suma 100 %', () => {
    const motivo = Capacitacion.motivoNoPublicable(3, [
      { nombre: 'Planificación', peso: 60 },
      { nombre: 'Ejecución', peso: 100 },
      { nombre: 'Cierre', peso: 120 },
    ]);
    expect(motivo).toBe('Antes de publicar, los pesos del test deben sumar 100 %: «Planificación» (60 %), «Cierre» (120 %).');
  });
  it('la falta de módulos tiene prioridad sobre los pesos', () => {
    expect(Capacitacion.motivoNoPublicable(0, [{ nombre: 'A', peso: 60 }])).toBe(MSG_SIN_MODULOS);
  });
});

describe('Capacitacion: transiciones de estado', () => {
  it('nace en BORRADOR y alterna BORRADOR ⇄ PUBLICADA', () => {
    const c = new Capacitacion();
    expect(c.estado).toBe('BORRADOR');
    expect(c.publicar()).toBe('PUBLICADA');
    expect(c.despublicar()).toBe('BORRADOR');
    expect(Capacitacion.estadoInicial).toBe('BORRADOR');
  });
});
