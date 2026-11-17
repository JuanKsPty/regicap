import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/providers';
import { SCRIPT_RECUPERACION_CHUNKS } from '@/lib/chunk-recovery';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'REGICAP', template: '%s · REGICAP' },
  description: 'Sistema de Registro Inteligente para Capacitaciones',
  icons: { icon: '/icon.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0F1B3D' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* En línea y antes que los bundles: si un chunk da 404 tras un despliegue, recarga una vez. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_RECUPERACION_CHUNKS }} />
      </head>
      <body>
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:font-semibold">
          Saltar al contenido
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
