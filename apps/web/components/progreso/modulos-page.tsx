'use client';

import { Alert, EmptyState, Skeleton } from '@regicap/ui';
import { Layers } from 'lucide-react';
import { Consulta, Cuadricula, PageHeader } from '@/components/page';
import { useInscripciones, useModulosDeInscripcion, useProgreso } from '@/lib/queries';
import { ModuloItem } from './modulo-item';

/** CU-04 2.1.4: módulos de una inscripción con su estado derivado. */
export function ModulosPage({ inscripcionId }: { inscripcionId: string }) {
  const query = useModulosDeInscripcion(inscripcionId);
  const progreso = useProgreso();
  const historial = useInscripciones('historial');
  const info = progreso.data?.find((p) => p.inscripcionId === inscripcionId) ?? historial.data?.inscripciones.find((i) => i.id === inscripcionId);
  const titulo = info ? ('titulo' in info ? info.titulo : '') : '';
  const empresa = info?.empresa;

  return (
    <>
      <PageHeader back={{ href: '/participante/tomar', label: 'Capacitaciones' }} title={titulo || 'Módulos'} subtitle={empresa} />
      <Consulta query={query} esqueleto={<Cuadricula cols={3}><Skeleton className="h-36" /><Skeleton className="h-36" /><Skeleton className="h-36" /></Cuadricula>}>
        {(modulos) =>
          modulos.length ? (
            <>
              {modulos.some((m) => m.pendienteCalificacion) && (
                <Alert tone="info" className="mb-4">La inteligencia artificial está calificando tus respuestas; el puntaje aparecerá aquí en unos segundos.</Alert>
              )}
              <Cuadricula cols={3}>{modulos.map((m) => <ModuloItem key={m.id} modulo={m} inscripcionId={inscripcionId} />)}</Cuadricula>
            </>
          ) : (
            <EmptyState icon={<Layers className="size-7" />} title="Esta capacitación aún no tiene módulos" description="Vuelve más tarde: la empresa está preparando el contenido." />
          )
        }
      </Consulta>
    </>
  );
}
