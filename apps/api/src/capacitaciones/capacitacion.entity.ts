import type { EstadoCapacitacion } from '@regicap/types';

/**
 * Entidad de dominio Capacitación: encapsula sus transiciones de estado
 * (figura 6): BORRADOR ⇄ PUBLICADA. Una capacitación nueva siempre nace en BORRADOR.
 */
export class Capacitacion {
  constructor(public estado: EstadoCapacitacion = 'BORRADOR') {}

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
