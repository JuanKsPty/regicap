import type { EstadoInscripcion } from '@regicap/types';

/**
 * Entidad de dominio Inscripción (figura 9). CU-03 solo produce las
 * transiciones a PENDIENTE y CANCELADA; EN_CURSO y COMPLETADA las fija
 * ProgresoService.actualizarEstadoInscripcion().
 */
export class Inscripcion {
  constructor(public estado: EstadoInscripcion) {}

  /** Solo una inscripción PENDIENTE (aún no iniciada) se puede cancelar. */
  puedeCancelarse(): boolean {
    return this.estado === 'PENDIENTE';
  }

  cancelar(): EstadoInscripcion {
    if (!this.puedeCancelarse()) throw new Error('Solo una inscripción PENDIENTE puede cancelarse.');
    this.estado = 'CANCELADA';
    return this.estado;
  }
}
