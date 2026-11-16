import type { EstadoInscripcion, Nivel } from '@regicap/types';
import { Badge } from '@regicap/ui';

const MAPA: Record<EstadoInscripcion, { tone: 'alto' | 'curso' | 'pendiente' | 'bajo'; texto: string }> = {
  PENDIENTE: { tone: 'pendiente', texto: 'Pendiente' },
  EN_CURSO: { tone: 'curso', texto: 'En curso' },
  COMPLETADA: { tone: 'alto', texto: 'Completada' },
  CANCELADA: { tone: 'bajo', texto: 'Cancelada' },
};
export const EstadoInscripcionBadge = ({ estado }: { estado: EstadoInscripcion }) => <Badge tone={MAPA[estado].tone}>{MAPA[estado].texto}</Badge>;

const NIVELES: Record<Nivel, { tone: 'alto' | 'medio' | 'bajo'; texto: string }> = {
  ALTO: { tone: 'alto', texto: 'Alto' },
  MEDIO: { tone: 'medio', texto: 'Medio' },
  BAJO: { tone: 'bajo', texto: 'Bajo' },
};
export const NivelBadge = ({ nivel }: { nivel: Nivel | null }) =>
  nivel ? <Badge tone={NIVELES[nivel].tone}>{NIVELES[nivel].texto}</Badge> : <Badge tone="pendiente">Sin datos</Badge>;

/** Color de la barra/valor según el puntaje (verde ≥ 80, ámbar 60–79, rojo < 60). */
export const colorPuntaje = (p: number | null) => (p === null ? 'text-fg-3' : p >= 80 ? 'text-success-fg' : p >= 60 ? 'text-warning-fg' : 'text-danger-fg');
export const fondoPuntaje = (p: number | null) => (p === null ? 'bg-border' : p >= 80 ? 'bg-success' : p >= 60 ? 'bg-warning' : 'bg-danger');
