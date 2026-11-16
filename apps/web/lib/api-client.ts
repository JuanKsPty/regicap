import type { ErrorApi } from '@regicap/types';

/** Error de la API con el formato uniforme { codigo, mensaje, campos } (RNF-07). */
export class ApiError extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly campos: Record<string, string>;

  constructor(status: number, cuerpo: Partial<ErrorApi>) {
    super(cuerpo.mensaje ?? 'Ocurrió un error inesperado.');
    this.status = status;
    this.codigo = cuerpo.codigo ?? 'ERROR_INTERNO';
    this.campos = cuerpo.campos ?? {};
  }
}

const BASE = '/api';

export interface Opciones {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * Cliente HTTP único hacia la API. La sesión viaja en la cookie httpOnly
 * (same-origin: sin CORS ni tokens en JavaScript).
 */
export async function api<T = void>(ruta: string, { method = 'GET', body, signal }: Opciones = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${ruta}`, {
      method,
      credentials: 'same-origin',
      signal,
      headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError(0, { codigo: 'SIN_CONEXION', mensaje: 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.' });
  }
  if (res.status === 204) return undefined as T;
  const tieneJson = (res.headers.get('content-type') ?? '').includes('json');
  const datos = tieneJson ? await res.json() : undefined;
  if (!res.ok) {
    // Sesión vencida: vuelve al login conservando la ruta
    if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !ruta.startsWith('/auth/')) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    }
    throw new ApiError(res.status, datos ?? {});
  }
  return datos as T;
}

/** Querystring sin valores vacíos. */
export function qs(params: Record<string, string | number | undefined | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}
