import { AppShell } from '@/components/shell/app-shell';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell rol="ADMINISTRADOR">{children}</AppShell>;
}
