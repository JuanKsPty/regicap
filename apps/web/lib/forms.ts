import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from './api-client';

/**
 * Traduce los errores de la API a mensajes JUNTO A CADA CAMPO sin limpiar el
 * formulario (EC-07). Devuelve el mensaje general cuando el error no es de campo.
 */
export function aplicarErroresApi<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, camposValidos?: string[]): string | null {
  if (!(error instanceof ApiError)) return 'Ocurrió un error inesperado.';
  let alguno = false;
  for (const [campo, mensaje] of Object.entries(error.campos)) {
    if (campo === '_' || (camposValidos && !camposValidos.includes(campo))) continue;
    setError(campo as Path<T>, { type: 'server', message: mensaje });
    alguno = true;
  }
  return alguno ? null : error.message;
}

export const mensajeDe = (e: unknown): string => (e instanceof ApiError ? e.message : 'Ocurrió un error inesperado.');
