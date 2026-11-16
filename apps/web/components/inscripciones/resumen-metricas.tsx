import type { ResumenInscripcionesDto } from '@regicap/types';
import { MetricCard } from '@regicap/ui';
import { Cuadricula } from '@/components/page';

export function ResumenMetricas({ resumen }: { resumen: ResumenInscripcionesDto }) {
  return (
    <Cuadricula cols={3}>
      <MetricCard label="Capacitaciones matriculadas" value={resumen.matriculadas} hint="activas y completadas" />
      <MetricCard label="Pendientes por completar" value={resumen.pendientes} hint="requieren tu atención" />
      <MetricCard label="Completadas" value={resumen.completadas} hint="finalizadas con éxito" />
    </Cuadricula>
  );
}
