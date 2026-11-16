import type { ProgresoDto } from '@regicap/types';
import { Card, Progress, SectionLabel } from '@regicap/ui';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

/** Tarjeta de CU-04: empresa, título, barra y «X/Y módulos completados» con «Continuar». */
export function ProgresoCard({ progreso: p }: { progreso: ProgresoDto }) {
  return (
    <Link href={`/participante/tomar/${p.inscripcionId}`} className="group block rounded-[10px] focus-visible:outline-2" aria-label={`Continuar ${p.titulo}`}>
      <Card className="rise h-full transition-all group-hover:-translate-y-0.5 group-hover:border-primary/50 group-hover:shadow-pop">
        <SectionLabel>{p.empresa}</SectionLabel>
        <h3 className="mb-3 mt-0.5 text-[14px] font-semibold leading-snug text-fg">{p.titulo}</h3>
        <Progress value={p.porcentaje} label={`Progreso de ${p.titulo}`} />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-fg-2">
            {p.enviados}/{p.total} módulos completados
          </span>
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary">
            Continuar <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </Card>
    </Link>
  );
}
