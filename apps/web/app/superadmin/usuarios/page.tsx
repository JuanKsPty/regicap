import type { Metadata } from 'next';
import { UsuariosPage } from '@/components/superadmin/usuarios-page';

export const metadata: Metadata = { title: 'Usuarios' };
export default function Page() {
  return <UsuariosPage />;
}
