'use client';

import { Alert, Skeleton } from '@regicap/ui';
import { Consulta, PageHeader, Section } from '@/components/page';
import { useCapacitaciones } from '@/lib/queries';
import { CapacitacionForm } from './capacitacion-form';
import { CapacitacionesTable } from './capacitaciones-table';

/** CU-11 Gestionar capacitaciones (la gestión de módulos CU-12 se abre con «Editar»). */
export function GestionarCapacitacionesPage() {
  const query = useCapacitaciones();
  return (
    <>
      <PageHeader title="Gestionar capacitaciones" subtitle="Registra tus capacitaciones y publícalas para que los participantes puedan inscribirse." />
      <Alert tone="info">Las capacitaciones publicadas aparecen automáticamente en el catálogo de inscripción del Participante.</Alert>
      <Section className="mt-5">
        <CapacitacionForm />
      </Section>
      <Section title="Mis capacitaciones registradas">
        <Consulta query={query} esqueleto={<Skeleton className="h-40" />}>
          {(lista) => <CapacitacionesTable capacitaciones={lista} />}
        </Consulta>
      </Section>
    </>
  );
}
