/**
 * Contrato hacia el almacenamiento de objetos (Fase 2 §7.4). La lógica de
 * negocio depende de esta interfaz, no de S3/MinIO/R2.
 */
export interface StorageProvider {
  /** URL firmada de carga (PUT). `maxBytes` es el tamaño exacto que se firma (ya validado ≤ límite). */
  urlDeSubida(clave: string, tipo: 'application/pdf', maxBytes: number): Promise<string>;
  /** URL firmada de lectura de corta duración. */
  urlDeLectura(clave: string, segundos: number): Promise<string>;
  eliminar(clave: string): Promise<void>;
  /** Metadatos del objeto subido, o null si no existe (para validar tipo y tamaño reales). */
  metadatos(clave: string): Promise<{ bytes: number; tipo: string } | null>;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
