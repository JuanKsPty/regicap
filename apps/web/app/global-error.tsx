'use client';

import { useEffect, useState } from 'react';
import { esErrorDeChunk, recargarUnaVez } from '@/lib/chunk-recovery';

/**
 * Límite de error raíz. Si el fallo es un chunk que ya no existe (despliegue
 * nuevo), recarga una vez para traer el build vigente; en cualquier otro caso
 * muestra un mensaje con opción de reintentar en lugar de la pantalla genérica
 * «Application error» de Next.js. Sustituye al layout raíz, por eso define
 * <html>/<body> y usa estilos en línea (globals.css puede no haber cargado).
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const deChunk = esErrorDeChunk(error);
  const [recargando, setRecargando] = useState(deChunk);

  useEffect(() => {
    if (deChunk) setRecargando(recargarUnaVez());
  }, [deChunk]);

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#F5F7FB', color: '#0F1B3D' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <div role="alert" style={{ maxWidth: 420, textAlign: 'center' }}>
            <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>{recargando ? 'Actualizando REGICAP…' : 'Algo salió mal'}</h1>
            <p style={{ fontSize: 14, margin: '0 0 20px', opacity: 0.8 }}>
              {recargando
                ? 'Hay una versión nueva de la aplicación. Recargando la página.'
                : deChunk
                  ? 'No se pudo cargar una parte de la aplicación. Revisa tu conexión y vuelve a cargar la página.'
                  : 'Ocurrió un error inesperado. Puedes reintentar o volver a cargar la página.'}
            </p>
            {!recargando && (
              <button
                type="button"
                onClick={() => (deChunk ? window.location.reload() : reset())}
                style={{ font: 'inherit', fontWeight: 600, padding: '10px 18px', borderRadius: 8, border: 0, background: '#0F1B3D', color: '#fff', cursor: 'pointer' }}
              >
                {deChunk ? 'Recargar' : 'Reintentar'}
              </button>
            )}
          </div>
        </main>
      </body>
    </html>
  );
}
