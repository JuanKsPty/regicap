import type { Metadata } from 'next';
import { AnalizarResultadosPage } from '@/components/admin/analizar-resultados-page';

export const metadata: Metadata = { title: 'Analizar resultados' };
export default function Page() {
  return <AnalizarResultadosPage />;
}
