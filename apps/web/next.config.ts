import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';
import path from 'node:path';

// El .env vive en la raíz del monorepo (lo comparten API, worker y web).
loadEnvConfig(path.resolve(__dirname, '../..'));

const apiInterna = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';

const config: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(__dirname, '../..'),
  transpilePackages: ['@regicap/ui', '@regicap/types'],
  poweredByHeader: false,
  reactStrictMode: true,
  // Web y API comparten dominio: el navegador solo habla con /api (la cookie
  // httpOnly viaja sin CORS). En producción lo enruta Traefik; en desarrollo, este rewrite.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiInterna}/api/:path*` }];
  },
  async headers() {
    return [
      {
        // Documentos HTML y payloads RSC: siempre revalidar. Las páginas prerenderizadas
        // (p. ej. /login) salían con `s-maxage=31536000`; cualquier caché intermedia podía
        // servir tras un despliegue el HTML del build anterior, que apunta a chunks con hash
        // que ya no existen (404 → «Application error»). Quedan fuera /api y
        // /_next/static, cuyos archivos llevan hash en el nombre y siguen siendo `immutable`.
        source: '/((?!api/|_next/static/|_next/image).*)',
        headers: [{ key: 'Cache-Control', value: 'private, no-cache, max-age=0, must-revalidate' }],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default config;
