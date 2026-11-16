import type { Metadata } from 'next';
import { AdministradoresPage } from '@/components/capacitaciones/administradores-page';

export const metadata: Metadata = { title: 'Administradores' };
export default function Page() {
  return <AdministradoresPage />;
}
