import type { Metadata } from 'next';
import { EmpresasPage } from '@/components/superadmin/empresas-page';

export const metadata: Metadata = { title: 'Empresas' };
export default function Page() {
  return <EmpresasPage />;
}
