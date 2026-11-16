'use client';

import { ConfirmDialog } from '@regicap/ui';
import { useToast } from '@/components/toast';
import { mensajeDe } from '@/lib/forms';
import { useEliminarCapacitacion } from '@/lib/queries';

/** Diálogo de confirmación que advierte la eliminación de los módulos (FA-4 / FE-3). */
export function ConfirmarEliminarDialog({ capacitacion, onClose, onEliminada }: { capacitacion: { id: string; nombre: string } | null; onClose: () => void; onEliminada?: () => void }) {
  const eliminar = useEliminarCapacitacion();
  const { toast } = useToast();
  return (
    <ConfirmDialog
      open={!!capacitacion}
      onOpenChange={(o) => !o && onClose()}
      title="¿Eliminar esta capacitación?"
      description={
        <>
          Se eliminará <strong className="text-fg">«{capacitacion?.nombre}»</strong> junto con todos sus módulos, actividades y preguntas. Esta acción no se puede deshacer.
          Si hay participantes inscritos, no podrá eliminarse.
        </>
      }
      confirmLabel="Eliminar"
      destructive
      loading={eliminar.isPending}
      onConfirm={async () => {
        if (!capacitacion) return;
        try {
          await eliminar.mutateAsync(capacitacion.id);
          toast('Capacitación eliminada.');
          onEliminada?.();
        } catch (e) {
          toast(mensajeDe(e), 'error'); // FE-3: «No se puede eliminar: hay participantes inscritos.»
        } finally {
          onClose();
        }
      }}
    />
  );
}
