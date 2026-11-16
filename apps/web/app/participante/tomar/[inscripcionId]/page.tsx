import type { Metadata } from 'next';
import { ModulosPage } from '@/components/progreso/modulos-page';

export const metadata: Metadata = { title: 'Módulos' };
export default async function Page({ params }: { params: Promise<{ inscripcionId: string }> }) {
  const { inscripcionId } = await params;
  return <ModulosPage inscripcionId={inscripcionId} />;
}
