import type { Metadata } from 'next';
import { DetalleCapacitacionPage } from '@/components/admin/detalle-capacitacion-page';

export const metadata: Metadata = { title: 'Detalle de capacitación' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DetalleCapacitacionPage id={id} />;
}
