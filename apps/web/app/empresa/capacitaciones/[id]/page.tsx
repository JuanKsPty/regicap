import type { Metadata } from 'next';
import { GestionarModulosPage } from '@/components/modulos/gestionar-modulos-page';

export const metadata: Metadata = { title: 'Gestionar módulos' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GestionarModulosPage id={id} />;
}
