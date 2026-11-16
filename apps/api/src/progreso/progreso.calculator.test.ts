import { describe, expect, it } from 'vitest';
import { ProgresoCalculator } from './progreso.calculator';

const calc = new ProgresoCalculator();

describe('ProgresoCalculator.porcentaje', () => {
  it('redondea enviados × 100 / total', () => {
    expect(calc.porcentaje(1, 3)).toBe(33);
    expect(calc.porcentaje(2, 3)).toBe(67);
    expect(calc.porcentaje(3, 3)).toBe(100);
  });
  it('total = 0 → 0 %', () => expect(calc.porcentaje(0, 0)).toBe(0));
  it('nunca supera 100', () => expect(calc.porcentaje(5, 3)).toBe(100));
});

describe('ProgresoCalculator.estadoModulo', () => {
  it('sin respuesta → POR_RESOLVER', () => expect(calc.estadoModulo(null)).toBe('POR_RESOLVER'));
  it('borrador → BORRADOR', () => expect(calc.estadoModulo({ estado: 'BORRADOR' })).toBe('BORRADOR'));
  it('enviada → ENVIADO', () => expect(calc.estadoModulo({ estado: 'ENVIADA' })).toBe('ENVIADO'));
});

describe('ProgresoCalculator.estadoInscripcion', () => {
  it('0 enviados → PENDIENTE', () => expect(calc.estadoInscripcion(0, 3)).toBe('PENDIENTE'));
  it('algunos → EN_CURSO', () => expect(calc.estadoInscripcion(1, 3)).toBe('EN_CURSO'));
  it('todos → COMPLETADA', () => expect(calc.estadoInscripcion(3, 3)).toBe('COMPLETADA'));
  it('nunca modifica una CANCELADA', () => expect(calc.estadoInscripcion(3, 3, 'CANCELADA')).toBe('CANCELADA'));
});
