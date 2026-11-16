import type { Metadata } from 'next';
import { GestionarCapacitacionesPage } from '@/components/capacitaciones/gestionar-capacitaciones-page';

export const metadata: Metadata = { title: 'Gestionar capacitaciones' };
export default function Page() {
  return <GestionarCapacitacionesPage />;
}
