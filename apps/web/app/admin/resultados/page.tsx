import type { Metadata } from 'next';
import { ConsultarResultadosPage } from '@/components/admin/consultar-resultados-page';

export const metadata: Metadata = { title: 'Consultar resultados' };
export default function Page() {
  return <ConsultarResultadosPage />;
}
