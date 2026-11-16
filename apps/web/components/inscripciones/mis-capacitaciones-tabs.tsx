'use client';

import type { VistaInscripciones } from '@regicap/types';
import { EmptyState, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@regicap/ui';
import { BookOpen } from 'lucide-react';
import { useState } from 'react';
import { Consulta } from '@/components/page';
import { useInscripciones } from '@/lib/queries';
import { InscripcionCard } from './inscripcion-card';

function Lista({ vista }: { vista: VistaInscripciones }) {
  const query = useInscripciones(vista);
  return (
    <Consulta query={query} esqueleto={<Skeleton className="h-28" />}>
      {(d) =>
        d.inscripciones.length ? (
          <div className="space-y-2.5">
            {d.inscripciones.map((i) => (
              <InscripcionCard key={i.id} inscripcion={i} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<BookOpen className="size-7" />}
            title={vista === 'activas' ? 'No tienes capacitaciones activas' : 'Aún no tienes capacitaciones en tu historial'}
            description={vista === 'activas' ? 'Explora el catálogo de abajo e inscríbete con un clic.' : 'Aquí aparecerán las completadas y las canceladas.'}
          />
        )
      }
    </Consulta>
  );
}

/** Pestañas «Activas» / «Historial» con sus estados vacíos (FE-1 / FE-3). */
export function MisCapacitacionesTabs() {
  const [vista, setVista] = useState<VistaInscripciones>('activas');
  return (
    <Tabs value={vista} onValueChange={(v) => setVista(v as VistaInscripciones)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.5px] text-fg-2">Mis capacitaciones</h2>
        <TabsList>
          <TabsTrigger value="activas">Activas</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="activas" className="focus:outline-none">
        <Lista vista="activas" />
      </TabsContent>
      <TabsContent value="historial" className="focus:outline-none">
        <Lista vista="historial" />
      </TabsContent>
    </Tabs>
  );
}
