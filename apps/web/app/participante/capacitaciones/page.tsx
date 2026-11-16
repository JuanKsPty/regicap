import type { Metadata } from 'next';
import { AdministrarCapacitacionesPage } from '@/components/inscripciones/administrar-capacitaciones-page';

export const metadata: Metadata = { title: 'Administrar capacitaciones' };
export default function Page() {
  return <AdministrarCapacitacionesPage />;
}
