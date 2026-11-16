import type { EstadoCapacitacion } from '@regicap/types';
import { Badge } from '@regicap/ui';

/** Etiqueta visual del estado Borrador/Publicada (CU-11). */
export function EstadoBadge({ estado }: { estado: EstadoCapacitacion }) {
  return estado === 'PUBLICADA' ? <Badge tone="alto">Publicada</Badge> : <Badge tone="pendiente">Borrador</Badge>;
}
