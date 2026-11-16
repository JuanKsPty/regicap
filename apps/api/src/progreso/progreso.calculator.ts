import type { EstadoInscripcion, EstadoModulo } from '@regicap/types';

/**
 * Funciones puras de CU-04 (sin dependencias): se prueban de forma aislada.
 * Fase 2 §5.4 — "Cálculo del progreso y del estado".
 */
export class ProgresoCalculator {
  /** round(enviados × 100 / total); 0 si total = 0. */
  porcentaje(enviados: number, total: number): number {
    if (total <= 0) return 0;
    return Math.min(100, Math.round((enviados * 100) / total));
  }

  /** Sin respuesta → POR_RESOLVER · BORRADOR → BORRADOR · ENVIADA → ENVIADO. */
  estadoModulo(respuesta: { estado: 'BORRADOR' | 'ENVIADA' } | null | undefined): EstadoModulo {
    if (!respuesta) return 'POR_RESOLVER';
    return respuesta.estado === 'ENVIADA' ? 'ENVIADO' : 'BORRADOR';
  }

  /**
   * 0 → PENDIENTE · 0 < enviados < total → EN_CURSO · enviados = total → COMPLETADA.
   * Nunca modifica una inscripción CANCELADA.
   */
  estadoInscripcion(enviados: number, total: number, actual?: EstadoInscripcion): EstadoInscripcion {
    if (actual === 'CANCELADA') return 'CANCELADA';
    if (enviados <= 0) return 'PENDIENTE';
    if (enviados < total) return 'EN_CURSO';
    return 'COMPLETADA';
  }
}
