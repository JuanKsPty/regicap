import type { EstadoCapacitacion } from '@regicap/types';

export const MSG_SIN_MODULOS = 'Agrega al menos un módulo antes de publicar.';

/**
 * Entidad de dominio Capacitación: encapsula sus transiciones de estado
 * (figura 6): BORRADOR ⇄ PUBLICADA. Una capacitación nueva siempre nace en BORRADOR.
 */
export class Capacitacion {
  constructor(public estado: EstadoCapacitacion = 'BORRADOR') {}

  /**
   * Reglas previas a FA-2. Devuelve el motivo (mensaje para la Empresa) por el que
   * la capacitación NO puede entrar al catálogo, o `null` si puede publicarse:
   *  1. debe tener al menos un módulo (una capacitación vacía no se ofrece al Participante);
   *  2. RF-06: el test de cada módulo con preguntas debe sumar 100 %.
   */
  static motivoNoPublicable(totalModulos: number, pesosTest: { nombre: string; peso: number }[]): string | null {
    if (totalModulos < 1) return MSG_SIN_MODULOS;
    const invalidos = pesosTest.filter((m) => Math.abs(m.peso - 100) > 0.01);
    if (invalidos.length) {
      const lista = invalidos.map((m) => `«${m.nombre}» (${m.peso} %)`).join(', ');
      return `Antes de publicar, los pesos del test deben sumar 100 %: ${lista}.`;
    }
    return null;
  }

  /** FA-2: entra al catálogo. */
  publicar(): EstadoCapacitacion {
    this.estado = 'PUBLICADA';
    return this.estado;
  }

  /** FA-3: sale del catálogo y vuelve a BORRADOR. */
  despublicar(): EstadoCapacitacion {
    this.estado = 'BORRADOR';
    return this.estado;
  }

  static get estadoInicial(): EstadoCapacitacion {
    return 'BORRADOR';
  }
}
