/**
 * Recuperación ante «version skew» tras un despliegue.
 *
 * Cada build de Next.js genera chunks con hash nuevo y el contenedor anterior
 * (con los chunks viejos) desaparece. Un HTML o un bundle del build anterior
 * (pestaña abierta, caché intermedia, restauración de sesión del navegador)
 * pide entonces `/_next/static/chunks/<hash-viejo>.js`, recibe 404 y React
 * muestra «Application error: a client-side exception has occurred».
 *
 * Solución: al detectar el fallo de carga de un chunk se recarga la página UNA
 * vez, lo que trae el HTML del build vigente. La marca en sessionStorage evita
 * bucles de recarga si el fallo persiste (p. ej. sin conexión).
 */
export const CLAVE_RECARGA = 'regicap:chunk-reload';
/** Ventana en la que no se reintenta la recarga automática. */
export const VENTANA_RECARGA_MS = 30_000;

const PATRON_CHUNK = /ChunkLoadError|Loading chunk [\w-]+ failed|Loading CSS chunk|Failed to load chunk|Failed to fetch dynamically imported module/i;

/** ¿El error corresponde a un chunk de Next.js que no se pudo descargar? */
export function esErrorDeChunk(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  return PATRON_CHUNK.test(`${typeof name === 'string' ? name : ''} ${typeof message === 'string' ? message : ''}`);
}

/**
 * Recarga la página como mucho una vez por ventana. Devuelve `true` si lanzó la
 * recarga y `false` si ya se había intentado (o no hay sessionStorage).
 */
export function recargarUnaVez(): boolean {
  try {
    const ultima = Number(window.sessionStorage.getItem(CLAVE_RECARGA) ?? 0);
    if (Date.now() - ultima < VENTANA_RECARGA_MS) return false;
    window.sessionStorage.setItem(CLAVE_RECARGA, String(Date.now()));
  } catch {
    return false; // sin sessionStorage no hay forma de garantizar «una sola vez»
  }
  window.location.reload();
  return true;
}

/**
 * Misma lógica, en línea dentro del HTML (ver app/layout.tsx): debe funcionar
 * aunque NINGÚN chunk llegue a cargar, así que no puede vivir en el bundle.
 * Escucha en fase de captura los `error` de <script>/<link> que apuntan a
 * /_next/static/ y los rechazos de import() dinámicos.
 */
export const SCRIPT_RECUPERACION_CHUNKS = `(function(){
var K=${JSON.stringify(CLAVE_RECARGA)},W=${VENTANA_RECARGA_MS},P=${PATRON_CHUNK.toString()};
function r(){try{var t=Number(sessionStorage.getItem(K)||0);if(Date.now()-t<W)return;sessionStorage.setItem(K,String(Date.now()))}catch(e){return}location.reload()}
function c(x){return !!x&&P.test((x.name||'')+' '+(x.message||''))}
addEventListener('error',function(e){var t=e.target;
if(t&&t!==window){var u=t.src||t.href||'';if((t.tagName==='SCRIPT'||(t.tagName==='LINK'&&t.rel==='stylesheet'))&&u.indexOf('/_next/static/')!==-1)r();return}
if(c(e.error)||c({message:e.message}))r()},true);
addEventListener('unhandledrejection',function(e){if(c(e.reason))r()});
})();`;
