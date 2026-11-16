import type { Nivel } from './enums';

/** Alto ≥ 80 · Medio 60–79 · Bajo < 60 (Fase 2 §3.5 paso 4). */
export function nivelDesdePuntaje(puntaje: number): Nivel {
  if (puntaje >= 80) return 'ALTO';
  if (puntaje >= 60) return 'MEDIO';
  return 'BAJO';
}

/** Cohorte semestral de una fecha: ene–jun → "AAAA-A", jul–dic → "AAAA-B". */
export function cohorteDe(fecha: Date | string): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return `${d.getUTCFullYear()}-${d.getUTCMonth() < 6 ? 'A' : 'B'}`;
}

/** Rango [desde, hasta) de una cohorte "AAAA-A|B". */
export function rangoCohorte(cohorte: string): { desde: Date; hasta: Date } {
  const [anio, medio] = cohorte.split('-') as [string, 'A' | 'B'];
  const y = Number(anio);
  return medio === 'A'
    ? { desde: new Date(Date.UTC(y, 0, 1)), hasta: new Date(Date.UTC(y, 6, 1)) }
    : { desde: new Date(Date.UTC(y, 6, 1)), hasta: new Date(Date.UTC(y + 1, 0, 1)) };
}

export function promedio(valores: number[]): number | null {
  if (!valores.length) return null;
  return Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);
}
