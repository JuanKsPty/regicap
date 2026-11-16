import type { Metadata } from 'next';
import { AnalisisParticipantePage } from '@/components/admin/analisis-participante-page';

export const metadata: Metadata = { title: 'Análisis del participante' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AnalisisParticipantePage id={id} />;
}
