'use client';

import { Badge, Skeleton } from '@regicap/ui';
import { Cuadricula, PageHeader, Section } from '@/components/page';
import { useInscripciones } from '@/lib/queries';
import { CatalogoGrid } from './catalogo-grid';
import { MisCapacitacionesTabs } from './mis-capacitaciones-tabs';
import { ResumenMetricas } from './resumen-metricas';

/** CU-03 Administrar capacitaciones (Participante). */
export function AdministrarCapacitacionesPage() {
  const q = useInscripciones('activas');
  return (
    <>
      <PageHeader title="Administrar capacitaciones" subtitle="Consulta tus capacitaciones, inscríbete en nuevas o cancela las que aún no iniciaste." />
      {q.data ? <ResumenMetricas resumen={q.data.resumen} /> : <Cuadricula cols={3}><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></Cuadricula>}
      <Section>
        <MisCapacitacionesTabs />
      </Section>
      <Section title="Capacitaciones disponibles" aside={<Badge tone="neutral">Datos de proveedores externos</Badge>}>
        <CatalogoGrid />
      </Section>
    </>
  );
}
