/**
 * Contrato hacia el servicio de IA (Fase 2 §7.4). La lógica de negocio solo
 * conoce esta interfaz: el proveedor concreto (LLM real o MockIAProvider) se
 * elige con la variable de entorno IA_PROVIDER.
 */
export interface CriterioIA {
  nombre: string;
  puntaje: number;
}

export interface IAProvider {
  calificar(entrada: { pregunta: string; respuesta: string; rubrica: string }): Promise<{ puntaje: number; criterios: CriterioIA[] }>;
}

export const IA_PROVIDER = Symbol('IA_PROVIDER');

export const CRITERIOS_IA = ['pertinencia', 'claridad', 'profundidad'] as const;
