import type { Metadata } from 'next';
import { TomarCapacitacionesPage } from '@/components/progreso/tomar-capacitaciones-page';

export const metadata: Metadata = { title: 'Tomar capacitaciones' };
export default function Page() {
  return <TomarCapacitacionesPage />;
}
