'use client';

import type { InscripcionDto } from '@regicap/types';
import { Button, Card, ConfirmDialog, Progress, SectionLabel } from '@regicap/ui';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useToast } from '@/components/toast';
import { mensajeDe } from '@/lib/forms';
import { useCancelarInscripcion } from '@/lib/queries';
import { EstadoInscripcionBadge } from './estado-inscripcion-badge';

const NOTA = { COMPLETADA: 'Finalizada', CANCELADA: 'Inscripción cancelada', EN_CURSO: 'En progreso', PENDIENTE: 'Aún no iniciada' } as const;

/** Tarjeta de «Mis capacitaciones»: empresa, título, barra de progreso, estado y acciones. */
export function InscripcionCard({ inscripcion: i }: { inscripcion: InscripcionDto }) {
  const cancelar = useCancelarInscripcion();
  const { toast } = useToast();
  const [confirmar, setConfirmar] = useState(false);
  const activa = i.estado === 'PENDIENTE' || i.estado === 'EN_CURSO';

  return (
    <Card className="rise">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <SectionLabel>{i.empresa}</SectionLabel>
          <h3 className="mt-0.5 text-[14px] font-semibold leading-snug text-fg">{i.titulo}</h3>
        </div>
        <EstadoInscripcionBadge estado={i.estado} />
      </div>
      {i.estado !== 'CANCELADA' && (
        <div className="mt-3 flex items-center gap-2.5">
          <Progress value={i.progreso} label={`Progreso de ${i.titulo}`} className="flex-1" barClassName={i.estado === 'COMPLETADA' ? 'bg-success' : undefined} />
          <span className="w-9 text-right text-[11px] font-semibold text-fg-2">{i.progreso} %</span>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] italic text-fg-2">{NOTA[i.estado]}</span>
        <div className="flex flex-wrap gap-2">
          {i.estado === 'PENDIENTE' && (
            <Button size="sm" variant="secondary" onClick={() => setConfirmar(true)}>
              Cancelar inscripción
            </Button>
          )}
          {activa && (
            <Button size="sm" asChild>
              <Link href={`/participante/tomar/${i.id}`}>
                Continuar <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </Button>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirmar}
        onOpenChange={setConfirmar}
        title="¿Cancelar tu inscripción?"
        description={<>Dejarás de estar inscrito en <strong className="text-fg">«{i.titulo}»</strong>. Podrás volver a inscribirte desde el catálogo mientras siga publicada.</>}
        confirmLabel="Cancelar inscripción"
        cancelLabel="Mantener"
        destructive
        loading={cancelar.isPending}
        onConfirm={() =>
          cancelar
            .mutateAsync(i.id)
            .then(() => toast('Inscripción cancelada.'))
            .catch((e) => toast(mensajeDe(e), 'error'))
            .finally(() => setConfirmar(false))
        }
      />
    </Card>
  );
}
