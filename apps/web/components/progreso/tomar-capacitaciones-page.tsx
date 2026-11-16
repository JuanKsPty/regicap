'use client';

import { Alert, Button, EmptyState, Skeleton } from '@regicap/ui';
import { PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { Consulta, Cuadricula, PageHeader } from '@/components/page';
import { useProgreso } from '@/lib/queries';
import { ProgresoCard } from './progreso-card';

/** CU-04 Tomar capacitaciones: capacitaciones activas con su progreso. */
export function TomarCapacitacionesPage() {
  const query = useProgreso();
  return (
    <>
      <PageHeader title="Tomar capacitaciones" subtitle="Elige una capacitación matriculada para resolver sus módulos." />
      <Consulta query={query} esqueleto={<Cuadricula cols={2}><Skeleton className="h-28" /><Skeleton className="h-28" /></Cuadricula>}>
        {(lista) =>
          lista.length ? (
            <>
              <Alert tone="info" className="mb-4">Selecciona una capacitación para ver sus módulos y continuar donde lo dejaste.</Alert>
              <Cuadricula cols={2}>{lista.map((p) => <ProgresoCard key={p.inscripcionId} progreso={p} />)}</Cuadricula>
            </>
          ) : (
            <EmptyState
              icon={<PlayCircle className="size-7" />}
              title="No tienes capacitaciones activas"
              description="Inscríbete desde Administrar capacitaciones para empezar a resolver módulos."
              action={<Button asChild><Link href="/participante/capacitaciones">Ir al catálogo</Link></Button>}
            />
          )
        }
      </Consulta>
    </>
  );
}
