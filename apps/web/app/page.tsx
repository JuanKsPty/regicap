import { redirect } from 'next/navigation';

// El middleware ya redirige según la sesión; esto es solo la red de seguridad.
export default function Inicio() {
  redirect('/login');
}
