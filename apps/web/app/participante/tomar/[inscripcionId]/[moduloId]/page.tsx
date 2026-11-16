import type { Metadata } from 'next';
import { ResolverModuloPage } from '@/components/resolver/resolver-modulo-page';

export const metadata: Metadata = { title: 'Resolver módulo' };
export default async function Page({ params }: { params: Promise<{ inscripcionId: string; moduloId: string }> }) {
  const { inscripcionId, moduloId } = await params;
  return <ResolverModuloPage inscripcionId={inscripcionId} moduloId={moduloId} />;
}
