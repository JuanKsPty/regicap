#!/usr/bin/env node
/**
 * EC-09 · Confiabilidad: "el servicio de IA no responde".
 * Estímulo: un módulo enviado mientras el proveedor falla.
 * Esperado: la respuesta queda guardada como «Pendiente de calificación», el
 * trabajo se reintenta (5 veces, espera exponencial) y, si se agotan, la
 * Calificación pasa a ERROR sin perder la respuesta; luego se reencola y se califica.
 *
 * Requiere: API en http://localhost:3001/api, seed cargado y Docker/Redis arriba.
 *   node scripts/verify-ec09.mjs
 * Reinicia la API y el worker por su cuenta con espera de reintento de 300 ms
 * (el backoff lo fija quien ENCOLA, es decir la API) y deja ambos en marcha al terminar.
 */
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const API = process.env.API_URL ?? 'http://localhost:3001/api';
const PASS = 'Regicap2026!';
const WORKER = resolve(import.meta.dirname, '../apps/api/dist/worker.js');
const MAIN = resolve(import.meta.dirname, '../apps/api/dist/main.js');
const cuando = (p) => new Promise((r) => p.on('exit', r));
let fallos = 0;
const check = (n, c, d = '') => {
  console.log(`  ${c ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m'} ${n} ${c ? '' : `\x1b[90m${d}\x1b[0m`}`);
  if (!c) fallos += 1;
};
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function cliente() {
  let cookie = '';
  const req = async (method, ruta, body) => {
    const res = await fetch(API + ruta, { method, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    for (const c of res.headers.getSetCookie?.() ?? []) if (c.startsWith('regicap_token=')) cookie = c.split(';')[0];
    return { status: res.status, data: res.status === 204 ? null : await res.json() };
  };
  return { get: (r) => req('GET', r), post: (r, b) => req('POST', r, b ?? {}) };
}

function worker(env) {
  const p = spawn('node', [WORKER], { env: { ...process.env, ...env }, stdio: 'ignore' });
  return p;
}

async function esperar(fn, ms = 20000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    const v = await fn();
    if (v) return v;
    await dormir(400);
  }
  return null;
}

console.log('EC-09 · el servicio de IA falla');
// Reinicia API y worker con la espera de reintento corta. Los patrones no llevan
// «.js» porque `nest start` (pnpm dev) lanza `node dist/main` y `node dist/worker`:
// si alguno sigue vivo, la API vieja encola con la espera de .env (30 s) y un worker
// sano califica el módulo, de modo que la prueba no mide la caída de la IA (D-4).
for (const patron of ['dist/worker', 'dist/main']) await cuando(spawn('pkill', ['-f', patron]));
await dormir(1500);
if ((await fetch(`${API}/health`).catch(() => null))?.ok) {
  console.error('\x1b[31m✘ Sigue respondiendo una API en el puerto 3001 (¿pnpm dev?). Detenla y vuelve a ejecutar.\x1b[0m');
  process.exit(2);
}
const api = spawn('node', [MAIN], { env: { ...process.env, CALIFICACION_BACKOFF_MS: '300' }, stdio: 'ignore' });
for (let i = 0; i < 30; i++) {
  if ((await fetch(`${API}/health`).catch(() => null))?.ok) break;
  await dormir(500);
}

const empresa = cliente();
const part = cliente();
const sfx = Math.random().toString(36).slice(2, 7);
await empresa.post('/auth/registro', { rol: 'EMPRESA', nombre: 'Emp', email: `ec9e-${sfx}@prueba.co`, password: PASS, empresaNombre: `EC09 ${sfx}` });
const cap = (await empresa.post('/empresa/capacitaciones', { nombre: 'Curso EC09', duracion: 1 })).data;
const mod = (await empresa.post(`/empresa/capacitaciones/${cap.id}/modulos`, { nombre: 'Único' })).data;
await empresa.post(`/empresa/capacitaciones/${cap.id}/publicar`);
await part.post('/auth/registro', { rol: 'PARTICIPANTE', nombre: 'Part', email: `p9-${sfx}@prueba.co`, password: PASS });
const insc = (await part.post('/participante/inscripciones', { capacitacionId: cap.id })).data;
const ruta = `/participante/inscripciones/${insc.id}/modulos/${mod.id}`;

// 1) Worker con IA caída
// IA_MOCK_FALLAR solo afecta al proveedor simulado: se fuerza IA_PROVIDER=mock para que
// la prueba no dependa del .env local (con IA_PROVIDER=anthropic el worker calificaba bien, D-4).
let w = worker({ IA_PROVIDER: 'mock', IA_MOCK_FALLAR: 'true', CALIFICACION_BACKOFF_MS: '300' });
await dormir(3500);
const t0 = Date.now();
const env = await part.post(`${ruta}/enviar`, { reflexion: { aprendido: 'Aprendí bastante sobre el tema del curso en esta semana.', aplicacion: 'Lo aplicaré en mi negocio con un plan de trabajo.' } });
check('el envío responde de inmediato aunque la IA esté caída', env.status === 200 && Date.now() - t0 < 3000);
check('queda «Pendiente de calificación»', env.data.pendienteCalificacion === true);

const error = await esperar(async () => {
  const d = (await part.get(ruta)).data;
  return d.calificacion?.estado === 'ERROR' ? d : null;
}, 25000);
check('agotados los reintentos la Calificación pasa a ERROR', !!error);
const d1 = (await part.get(ruta)).data;
check('la respuesta NO se perdió (sigue ENVIADA) y se muestra «Pendiente de calificación»', d1.estado === 'ENVIADO' && d1.pendienteCalificacion === true && !!d1.respuesta, JSON.stringify(d1.estado));
w.kill();
await cuando(w);

// 2) El proveedor se recupera: el administrador reencola
const adminNombre = `adm-${sfx}@prueba.co`;
await empresa.post('/empresa/administradores', { nombre: 'Admin', email: adminNombre, password: PASS });
const admin = cliente();
await admin.post('/auth/login', { email: adminNombre, password: PASS });
const antes = (await admin.get('/admin/resultados')).data;
check('el Administrador ve el aviso de calificaciones con error', antes.calificacionesConError === 1);
w = worker({ IA_PROVIDER: 'mock', IA_MOCK_FALLAR: 'false', CALIFICACION_BACKOFF_MS: '300' });
await dormir(3000);
const re = await admin.post('/admin/calificaciones/reencolar');
check('reencola la calificación fallida', re.status === 200 && re.data.reencoladas === 1, JSON.stringify(re.data));
const ok = await esperar(async () => {
  const d = (await part.get(ruta)).data;
  return d.calificacion?.estado === 'CALIFICADA' ? d : null;
}, 20000);
check('se califica correctamente tras reencolar (0 respuestas perdidas)', !!ok && ok.calificacion.puntaje >= 0, JSON.stringify(ok?.calificacion));
const prog = (await part.get('/participante/inscripciones?vista=historial')).data;
check('la inscripción quedó COMPLETADA', prog.inscripciones.some((i) => i.id === insc.id && i.estado === 'COMPLETADA'));
w.kill();
api.kill();
await dormir(1000);

// Deja API y worker normales en marcha
for (const f of [MAIN, WORKER]) spawn('node', [f], { env: process.env, detached: true, stdio: 'ignore' }).unref();
console.log(fallos ? `\n\x1b[31m✘ ${fallos} fallos\x1b[0m` : '\n\x1b[32m✔ EC-09 verificado\x1b[0m');
process.exit(fallos ? 1 : 0);
