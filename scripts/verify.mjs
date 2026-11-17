#!/usr/bin/env node
/**
 * Verificación extremo a extremo de REGICAP contra una API en ejecución.
 * Cubre los casos de uso (CU-01…CU-12) y los escenarios de calidad EC-01…EC-10
 * de la Fase 2 (tabla 2).
 *
 *   pnpm verify                         (API en http://localhost:3001/api)
 *   API_URL=http://localhost:8080/api pnpm verify
 *
 * Requiere el seed de demostración cargado (pnpm db:seed).
 */
import { execSync } from 'node:child_process';

const API = process.env.API_URL ?? 'http://localhost:3001/api';
const PASS = 'Regicap2026!';
const sufijo = Math.random().toString(36).slice(2, 8);

let ok = 0;
let fallos = 0;
const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

function seccion(t) {
  console.log(`\n\x1b[1m${t}\x1b[0m`);
}
function check(nombre, cond, detalle = '') {
  if (cond) {
    ok += 1;
    console.log(`  ${verde('✔')} ${nombre}`);
  } else {
    fallos += 1;
    console.log(`  ${rojo('✘')} ${nombre} ${gris(detalle)}`);
  }
}

/** Cliente con jar de cookies (como un navegador). */
function cliente(nombre) {
  let cookie = '';
  return {
    nombre,
    async req(method, ruta, body, opts = {}) {
      const headers = { ...(body !== undefined && !(body instanceof Uint8Array) ? { 'content-type': 'application/json' } : {}) };
      if (cookie) headers.cookie = cookie;
      const t0 = performance.now();
      const res = await fetch(`${API}${ruta}`, {
        method,
        headers,
        body: body === undefined ? undefined : body instanceof Uint8Array ? body : JSON.stringify(body),
      });
      const ms = performance.now() - t0;
      const set = res.headers.getSetCookie?.() ?? [];
      for (const c of set) {
        const [par] = c.split(';');
        if (par.startsWith('regicap_token=')) cookie = par.endsWith('=') ? '' : par;
      }
      const ct = res.headers.get('content-type') ?? '';
      const data = opts.raw ? await res.arrayBuffer() : ct.includes('json') ? await res.json() : await res.text();
      return { status: res.status, data, ms, headers: res.headers, setCookie: set };
    },
  };
}
const nuevoCliente = (n) => {
  const c = cliente(n);
  c.get = (r, o) => c.req('GET', r, undefined, o);
  c.post = (r, b) => c.req('POST', r, b ?? {});
  c.put = (r, b) => c.req('PUT', r, b);
  c.patch = (r, b) => c.req('PATCH', r, b ?? {});
  c.del = (r) => c.req('DELETE', r);
  return c;
};
const login = async (email) => {
  const c = nuevoCliente(email);
  const r = await c.post('/auth/login', { email, password: PASS });
  if (r.status !== 200) throw new Error(`Login de ${email} falló (${r.status}). ¿Cargaste el seed?`);
  return c;
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function hasta(fn, { intentos = 40, cada = 500 } = {}) {
  for (let i = 0; i < intentos; i++) {
    const v = await fn();
    if (v) return v;
    await esperar(cada);
  }
  return null;
}

async function main() {
  console.log(`REGICAP · verificación contra ${API}`);

  seccion('Salud');
  const anon = nuevoCliente('anon');
  check('GET /health responde ok', (await anon.get('/health')).data.estado === 'ok');

  /* ───────────── CU-01 / CU-02 Autenticación ───────────── */
  seccion('CU-02 Registro · CU-01 Inicio de sesión');
  const empA = nuevoCliente('empresa A');
  const empB = nuevoCliente('empresa B');
  const part = nuevoCliente('participante');

  let r = await empA.post('/auth/registro', { rol: 'EMPRESA', nombre: 'Ana Empresa', email: `a-${sufijo}@prueba.co`, password: PASS, empresaNombre: `Proveedor A ${sufijo}`, empresaTipo: 'banco' });
  check('registra una Empresa (201 + cookie)', r.status === 201 && r.data.rol === 'EMPRESA' && r.data.empresaId && r.setCookie.length > 0, JSON.stringify(r.data));
  check('la cookie es httpOnly, SameSite=Lax y no expone el hash', /httponly/i.test(r.setCookie[0]) && /samesite=lax/i.test(r.setCookie[0]) && !('passwordHash' in r.data));
  const empAId = r.data.empresaId;
  r = await empB.post('/auth/registro', { rol: 'EMPRESA', nombre: 'Beto Empresa', email: `b-${sufijo}@prueba.co`, password: PASS, empresaNombre: `Proveedor B ${sufijo}` });
  check('registra una segunda Empresa', r.status === 201);
  r = await part.post('/auth/registro', { rol: 'PARTICIPANTE', nombre: 'Paula Participante', email: `p-${sufijo}@prueba.co`, password: PASS });
  check('registra un Participante', r.status === 201 && r.data.rol === 'PARTICIPANTE' && r.data.empresaId === null);

  r = await anon.post('/auth/registro', { rol: 'PARTICIPANTE', nombre: 'X', email: `p-${sufijo}@prueba.co`, password: PASS });
  check('correo duplicado → 409 EMAIL_DUPLICADO con mensaje por campo', r.status === 409 && r.data.codigo === 'EMAIL_DUPLICADO' && r.data.campos.email);
  r = await anon.post('/auth/registro', { rol: 'EMPRESA', nombre: 'X', email: `z-${sufijo}@prueba.co`, password: PASS, empresaNombre: `proveedor a ${sufijo}` });
  check('empresa duplicada (sin distinguir mayúsculas) → 409 EMPRESA_DUPLICADA', r.status === 409 && r.data.codigo === 'EMPRESA_DUPLICADA');
  r = await anon.post('/auth/registro', { rol: 'PARTICIPANTE', nombre: '', email: 'no-es-correo', password: '123' });
  check('validación → 400 con { codigo, mensaje, campos }', r.status === 400 && r.data.codigo && r.data.mensaje && r.data.campos.nombre && r.data.campos.email && r.data.campos.password, JSON.stringify(r.data));
  r = await anon.post('/auth/login', { email: `p-${sufijo}@prueba.co`, password: 'incorrecta' });
  check('login con contraseña errónea → 401 CREDENCIALES_INVALIDAS', r.status === 401 && r.data.codigo === 'CREDENCIALES_INVALIDAS');
  r = await part.get('/auth/me');
  check('GET /auth/me devuelve la sesión', r.status === 200 && r.data.email === `p-${sufijo}@prueba.co`);
  const sinSesion = await nuevoCliente('x').get('/auth/me');
  check('sin cookie → 401 NO_AUTENTICADO', sinSesion.status === 401 && sinSesion.data.codigo === 'NO_AUTENTICADO');

  /* ───────────── EC-01 Autorización por rol ───────────── */
  seccion('EC-01 · Autorización por rol (0 accesos indebidos)');
  const luis = await login('luis.perez@correo.com');
  const diego = await login('diego.ramirez@regicap.edu');
  const adminUtp = await login('admin.redes@utp.ac.pa');
  const empCamara = await login('contacto@camaracomercio.org');
  for (const [cli, rutas] of [
    [part, ['/empresa/capacitaciones', '/admin/resultados', '/admin/analisis']],
    [empA, ['/participante/inscripciones', '/catalogo', '/admin/resultados', '/participante/feedback']],
    [diego, ['/empresa/capacitaciones', '/participante/progreso', '/catalogo']],
  ]) {
    for (const ruta of rutas) {
      const x = await cli.get(ruta);
      check(`${cli.nombre} → GET ${ruta} = 403 ROL_NO_PERMITIDO`, x.status === 403 && x.data.codigo === 'ROL_NO_PERMITIDO', `status ${x.status}`);
    }
  }
  check('sin sesión → GET /empresa/capacitaciones = 401', (await anon.get('/empresa/capacitaciones')).status === 401);

  /* ───────────── CU-11 Gestionar capacitaciones ───────────── */
  seccion('CU-11 Gestionar capacitaciones (Empresa)');
  r = await empA.post('/empresa/capacitaciones', { nombre: '  ', duracion: '' });
  check('FE-1 campos vacíos → 400 CAMPOS_REQUERIDOS con mensaje por campo', r.status === 400 && r.data.codigo === 'CAMPOS_REQUERIDOS' && r.data.campos.nombre && r.data.campos.duracion, JSON.stringify(r.data));
  r = await empA.post('/empresa/capacitaciones', { nombre: 'Gestión de Proyectos', duracion: 6, estado: 'PUBLICADA' });
  check('FA-1 crea en BORRADOR (ignora el estado recibido) y guarda «6 semanas»', r.status === 201 && r.data.estado === 'BORRADOR' && r.data.modulos === 0 && r.data.duracion === '6 semanas', JSON.stringify(r.data));
  const capId = r.data.id;
  r = await empA.post('/empresa/capacitaciones', { nombre: 'gestión de proyectos', duracion: 1 });
  check('FE-2 nombre duplicado → 409 NOMBRE_DUPLICADO', r.status === 409 && r.data.codigo === 'NOMBRE_DUPLICADO' && r.data.campos.nombre);
  r = await empB.post('/empresa/capacitaciones', { nombre: 'Gestión de Proyectos', duracion: 2 });
  check('el mismo nombre en OTRA Empresa sí se permite (UNIQUE empresa+nombre)', r.status === 201);
  const capBId = r.data.id;
  r = await empA.patch(`/empresa/capacitaciones/${capId}`, { duracion: '8' });
  check('edita la duración (8 → «8 semanas»)', r.status === 200 && r.data.duracion === '8 semanas', JSON.stringify(r.data));

  // D-2: la duración es un entero de 1 a 52 semanas (Requerimiento especial de CU-11)
  const MSG_DURACION = 'La duración debe ser un número entero de semanas entre 1 y 52.';
  for (const mala of [0, 53, 2.5, '6 semanas', 'Por definir']) {
    r = await empA.post('/empresa/capacitaciones', { nombre: `Duración inválida ${mala}`, duracion: mala });
    check(`D-2 registrar con duración ${JSON.stringify(mala)} → 400 con mensaje junto al campo`, r.status === 400 && r.data.codigo === 'DATOS_INVALIDOS' && r.data.campos.duracion === MSG_DURACION && !r.data.campos.nombre, JSON.stringify(r.data));
  }
  r = await empA.patch(`/empresa/capacitaciones/${capId}`, { duracion: 53 });
  check('D-2 editar con duración 53 → 400 y no cambia el valor', r.status === 400 && r.data.campos.duracion === MSG_DURACION, JSON.stringify(r.data));
  r = await empA.post('/empresa/capacitaciones', { nombre: 'Curso de una semana', duracion: '1' });
  check('D-2 duración 1 → «1 semana»', r.status === 201 && r.data.duracion === '1 semana', JSON.stringify(r.data));
  const capUnaSemana = r.data.id;
  r = await empA.patch(`/empresa/capacitaciones/${capUnaSemana}`, { duracion: 52 });
  check('D-2 duración 52 → «52 semanas»', r.status === 200 && r.data.duracion === '52 semanas', JSON.stringify(r.data));

  // D-1: una capacitación sin módulos no puede publicarse
  r = await empA.post(`/empresa/capacitaciones/${capUnaSemana}/publicar`);
  check('D-1 publicar con 0 módulos → 409 PUBLICACION_INVALIDA', r.status === 409 && r.data.codigo === 'PUBLICACION_INVALIDA' && r.data.mensaje === 'Agrega al menos un módulo antes de publicar.', JSON.stringify(r.data));
  r = await empA.get('/empresa/capacitaciones');
  check('D-1 la capacitación sin módulos sigue en BORRADOR', r.data.find((c) => c.id === capUnaSemana)?.estado === 'BORRADOR');
  r = await part.get('/catalogo?page=1');
  check('D-1 y no aparece en el catálogo', r.status === 200 && !r.data.items.some((i) => i.capacitacionId === capUnaSemana));
  r = await empA.del(`/empresa/capacitaciones/${capUnaSemana}`);
  check('se elimina la capacitación de prueba', r.status === 204, `status ${r.status}`);

  /* ───────────── EC-02 Aislamiento entre Empresas ───────────── */
  seccion('EC-02 · Aislamiento entre Empresas (404 sin revelar existencia)');
  for (const [m, ruta] of [
    ['patch', `/empresa/capacitaciones/${capId}`],
    ['post', `/empresa/capacitaciones/${capId}/publicar`],
    ['post', `/empresa/capacitaciones/${capId}/despublicar`],
    ['get', `/empresa/capacitaciones/${capId}`],
    ['del', `/empresa/capacitaciones/${capId}`],
    ['post', `/empresa/capacitaciones/${capId}/modulos`],
  ]) {
    const x = await empB[m](ruta, m === 'patch' ? { nombre: 'Hackeada' } : m === 'post' ? { nombre: 'Intruso' } : undefined);
    check(`Empresa B ${m.toUpperCase()} ${ruta.replace(capId, ':idA')} = 404`, x.status === 404 && x.data.codigo === 'NO_ENCONTRADO', `status ${x.status}`);
  }
  r = await empA.get('/empresa/capacitaciones');
  check('la Empresa A solo ve las suyas', r.data.length === 1 && r.data[0].id === capId);
  r = await empA.get(`/empresa/capacitaciones/${capId}`);
  check('la capacitación de A sigue intacta', r.data.nombre === 'Gestión de Proyectos' && r.data.duracion === '8 semanas');

  /* ───────────── CU-12 Gestionar módulos ───────────── */
  seccion('CU-12 Gestionar módulos, actividades y test (Empresa)');
  r = await empA.post(`/empresa/capacitaciones/${capId}/modulos`, { nombre: 'Planificación' });
  check('crea el módulo 1', r.status === 201 && r.data.orden === 1);
  const mod1 = r.data.id;
  r = await empA.post(`/empresa/capacitaciones/${capId}/modulos`, { nombre: 'Ejecución' });
  const mod2 = r.data.id;
  check('crea el módulo 2', r.data.orden === 2);
  r = await empA.post(`/empresa/modulos/${mod2}/mover`, { direccion: -1 });
  check('reordena (sube el módulo 2)', r.status === 204);
  r = await empA.get(`/empresa/capacitaciones/${capId}`);
  check('el orden cambió sin romper UNIQUE(capacitacion, orden)', r.data.modulos[0].id === mod2 && r.data.modulos[1].id === mod1);

  r = await empA.post(`/empresa/modulos/${mod1}/actividades`, { tipo: 'TEXTO', titulo: 'Lectura', contenido: '<p>Hola <b>mundo</b></p><script>alert(1)</script><img src=x onerror=alert(2)><a href="javascript:alert(3)">x</a>' });
  check('actividad de texto: el HTML se sanea (sin script/onerror/javascript:)', r.status === 201 && !/script|onerror|javascript:/i.test(r.data.contenido) && r.data.contenido.includes('<b>mundo</b>'), r.data.contenido);
  r = await empA.post(`/empresa/modulos/${mod1}/actividades`, { tipo: 'VIDEO', titulo: 'Video', contenido: 'https://vimeo.com/123' });
  check('video que no es de YouTube → 400', r.status === 400 && r.data.campos.contenido);
  r = await empA.post(`/empresa/modulos/${mod1}/actividades`, { tipo: 'VIDEO', titulo: 'Video', contenido: 'https://www.youtube.com/watch?v=qEE0s9cnj34' });
  check('video de YouTube válido', r.status === 201);

  // PDF: URL firmada → subida directa → actividad → URL firmada de lectura
  r = await empA.post('/empresa/archivos/subida', { nombre: 'grande.pdf', tipo: 'application/pdf', tamano: 4 * 1024 * 1024 });
  check('PDF de 4 MB → 400 (límite 3 MB)', r.status === 400 && r.data.campos.tamano, JSON.stringify(r.data));
  r = await empA.post('/empresa/archivos/subida', { nombre: 'x.exe', tipo: 'application/x-msdownload', tamano: 100 });
  check('tipo que no es PDF → 400', r.status === 400);
  const pdf = new TextEncoder().encode('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
  r = await empA.post('/empresa/archivos/subida', { nombre: 'guia.pdf', tipo: 'application/pdf', tamano: pdf.length });
  check('solicita URL firmada de subida', r.status === 201 && r.data.url && r.data.clave.startsWith(`empresas/${empAId}/`), JSON.stringify(r.data));
  const { clave, url } = r.data;
  const put = await fetch(url, { method: 'PUT', headers: { 'content-type': 'application/pdf' }, body: pdf }).catch((e) => ({ status: 0, text: async () => String(e) }));
  check('el navegador sube el PDF directo al almacenamiento con la URL firmada', put.status === 200, `status ${put.status} ${put.status !== 200 ? await put.text() : ''}`);
  r = await empB.post(`/empresa/modulos/${mod1}/actividades`, { tipo: 'PDF', titulo: 'x', archivoKey: clave });
  check('otra Empresa no puede adjuntar mi PDF ni tocar mi módulo (404)', r.status === 404);
  r = await empA.post(`/empresa/modulos/${mod1}/actividades`, { tipo: 'PDF', titulo: 'Guía', archivoKey: `empresas/${capBId}/robado.pdf` });
  check('clave fuera del prefijo de mi Empresa → 400 ARCHIVO_INVALIDO', r.status === 400 && r.data.codigo === 'ARCHIVO_INVALIDO');
  r = await empA.post(`/empresa/modulos/${mod1}/actividades`, { tipo: 'PDF', titulo: 'Guía', archivoKey: clave });
  check('crea la actividad PDF', r.status === 201 && r.data.archivoUrl, JSON.stringify(r.data));
  const lectura = await fetch(r.data.archivoUrl);
  check('la URL firmada de lectura sirve el PDF', lectura.status === 200 && (lectura.headers.get('content-type') ?? '').includes('pdf') && (await lectura.text()).startsWith('%PDF'));
  const sinFirma = await fetch(r.data.archivoUrl.split('?')[0]);
  check('sin firma el PDF NO es accesible (bucket privado)', sinFirma.status === 403 || sinFirma.status === 401 || sinFirma.status === 400, `status ${sinFirma.status}`);

  // Test con pesos
  r = await empA.post(`/empresa/modulos/${mod1}/preguntas`, { tipo: 'SIMPLE', texto: '¿2+2?', peso: 60, opciones: ['3', '4'], respuestaCorrecta: '4' });
  check('pregunta de opción múltiple (60 %)', r.status === 201);
  r = await empA.post(`/empresa/modulos/${mod1}/preguntas`, { tipo: 'CUALITATIVA', texto: 'Explica', peso: 50, rubrica: 'claridad' });
  check('pesos > 100 % → 409 PESOS_INVALIDOS', r.status === 409 && r.data.codigo === 'PESOS_INVALIDOS' && r.data.campos.peso);
  r = await empA.post(`/empresa/modulos/${mod1}/preguntas`, { tipo: 'SIMPLE', texto: 'x', peso: 10, opciones: ['a'], respuestaCorrecta: 'a' });
  check('opción múltiple con <2 opciones → 400', r.status === 400);
  r = await empA.post(`/empresa/capacitaciones/${capId}/publicar`);
  check('publicar con test que no suma 100 % → 409 PUBLICACION_INVALIDA', r.status === 409 && r.data.codigo === 'PUBLICACION_INVALIDA', JSON.stringify(r.data));
  r = await empA.post(`/empresa/modulos/${mod1}/preguntas`, { tipo: 'TEXTO_LIBRE', texto: 'Explica con tus palabras la planificación', peso: 40, rubrica: 'planificación objetivos alcance' });
  check('completa el test a 100 %', r.status === 201);

  /* ───────────── CU-11 publicar / catálogo / CU-03 ───────────── */
  seccion('CU-11 FA-2/FA-3 Publicar · CU-03 Administrar capacitaciones');
  r = await part.get('/catalogo?page=1');
  check('BORRADOR no aparece en el catálogo', r.status === 200 && !r.data.items.some((i) => i.capacitacionId === capId));
  r = await empA.post(`/empresa/capacitaciones/${capId}/publicar`);
  check('FA-2 publica (PUBLICADA)', r.status === 200 && r.data.estado === 'PUBLICADA');
  r = await part.get('/catalogo?page=1');
  check('la capacitación publicada aparece en el catálogo con nº de módulos', r.data.items.some((i) => i.capacitacionId === capId && i.modulos === 2 && i.empresa.startsWith('Proveedor A')));
  check('el catálogo está paginado (12 por página)', r.data.pageSize === 12 && r.data.items.length <= 12 && r.data.total >= 1);
  r = await part.get('/participante/inscripciones?vista=activas');
  check('sin inscripciones: resumen en cero', r.status === 200 && r.data.resumen.matriculadas === 0 && r.data.inscripciones.length === 0);

  r = await part.post('/participante/inscripciones', { capacitacionId: capId });
  check('FA-2 inscribirse → 201 PENDIENTE', r.status === 201 && r.data.estado === 'PENDIENTE' && r.data.progreso === 0);
  const inscId = r.data.id;
  r = await part.post('/participante/inscripciones', { capacitacionId: capId });
  check('RF-07 segunda inscripción activa → 409 YA_INSCRITO', r.status === 409 && r.data.codigo === 'YA_INSCRITO');
  const dobles = await Promise.all([1, 2, 3].map(() => luis.post('/participante/inscripciones', { capacitacionId: capId })));
  check('RF-07 inscripciones simultáneas: solo una prospera (índice único parcial)', dobles.filter((x) => x.status === 201).length === 1 && dobles.filter((x) => x.status === 409).length === 2, dobles.map((x) => x.status).join(','));
  r = await part.get('/catalogo?page=1');
  check('el catálogo oculta lo ya inscrito', !r.data.items.some((i) => i.capacitacionId === capId));

  r = await part.patch(`/participante/inscripciones/${inscId}/cancelar`);
  check('FA-3 cancelar PENDIENTE → CANCELADA', r.status === 200 && r.data.estado === 'CANCELADA');
  r = await part.patch(`/participante/inscripciones/${inscId}/cancelar`);
  check('cancelar de nuevo → 409 NO_CANCELABLE', r.status === 409 && r.data.codigo === 'NO_CANCELABLE');
  r = await empB.get('/empresa/capacitaciones');
  r = await part.patch(`/participante/inscripciones/${(await luis.get('/participante/inscripciones?vista=activas')).data.inscripciones[0].id}/cancelar`);
  check('cancelar la inscripción de OTRO participante → 404', r.status === 404);
  r = await part.get('/participante/inscripciones?vista=historial');
  check('la cancelada se conserva en el Historial (D-12)', r.data.inscripciones.length === 1 && r.data.inscripciones[0].estado === 'CANCELADA');
  r = await part.post('/participante/inscripciones', { capacitacionId: capId });
  check('puede volver a inscribirse (nueva inscripción, el historial se conserva)', r.status === 201 && r.data.id !== inscId);
  const inscId2 = r.data.id;
  r = await part.get('/participante/inscripciones?vista=activas');
  check('resumen: 1 matriculada, 1 pendiente', r.data.resumen.matriculadas === 1 && r.data.resumen.pendientes === 1);

  // FE-4: ya no disponible
  const part2 = nuevoCliente('participante 2');
  await part2.post('/auth/registro', { rol: 'PARTICIPANTE', nombre: 'Segundo', email: `p2-${sufijo}@prueba.co`, password: PASS });
  await empA.post(`/empresa/capacitaciones/${capId}/despublicar`);
  r = await part2.post('/participante/inscripciones', { capacitacionId: capId });
  check('FE-4 inscribirse a una capacitación despublicada → 409 NO_DISPONIBLE', r.status === 409 && r.data.codigo === 'NO_DISPONIBLE');
  r = await empA.get(`/empresa/capacitaciones/${capId}`);
  check('FA-3 despublicar la devuelve a BORRADOR (solo 2 estados)', r.data.estado === 'BORRADOR');
  await empA.post(`/empresa/capacitaciones/${capId}/publicar`);

  /* ───────────── CU-04 / CU-05 / CU-07 ───────────── */
  seccion('CU-04 Tomar capacitaciones · CU-05 Resolver módulos · CU-07 Procesar resultados (IA)');
  r = await part.get('/participante/progreso');
  check('progreso de capacitaciones activas', r.status === 200 && r.data.length === 1 && r.data[0].total === 2 && r.data[0].enviados === 0 && r.data[0].porcentaje === 0);
  r = await part.get(`/participante/progreso/${inscId2}/modulos`);
  check('módulos con estado POR_RESOLVER', r.data.length === 2 && r.data.every((m) => m.estado === 'POR_RESOLVER') && r.data[0].id === mod2);
  r = await part2.get(`/participante/progreso/${inscId2}/modulos`);
  check('módulos de la inscripción de otro participante → 404', r.status === 404);
  r = await part.get(`/participante/inscripciones/${inscId2}/modulos/${mod1}`);
  check('detalle del módulo: actividades con URL firmada y preguntas SIN clave de respuesta', r.status === 200 && r.data.actividades.length === 3 && r.data.preguntas.length === 2 && !JSON.stringify(r.data).includes('respuestaCorrecta') && !JSON.stringify(r.data).includes('rubrica'), JSON.stringify(r.data).slice(0, 300));
  const preg = r.data.preguntas;
  r = await part.post(`/participante/inscripciones/${inscId2}/modulos/${mod1}/enviar`, { examen: [] });
  check('FE-1 enviar incompleto → 400 CAMPOS_REQUERIDOS con mensaje por pregunta', r.status === 400 && r.data.codigo === 'CAMPOS_REQUERIDOS' && preg.every((p) => r.data.campos[p.id]), JSON.stringify(r.data));
  r = await part.put(`/participante/inscripciones/${inscId2}/modulos/${mod1}/borrador`, { examen: [{ preguntaId: preg[0].id, valor: '4' }] });
  check('FA guardar borrador → estado BORRADOR', r.status === 200 && r.data.estado === 'BORRADOR');
  const respuestas = [{ preguntaId: preg[0].id, valor: '4' }, { preguntaId: preg[1].id, valor: 'La planificación define objetivos, alcance y cronograma del proyecto; sin ella el equipo no sabe qué entregar ni cuándo.' }];
  r = await part.post(`/participante/inscripciones/${inscId2}/modulos/${mod1}/enviar`, { examen: respuestas });
  check('EC-04 enviar un módulo responde de inmediato (≤ 3 s) sin esperar a la IA', r.status === 200 && r.data.estado === 'ENVIADO' && r.ms < 3000, `${Math.round(r.ms)} ms`);
  check('queda "Pendiente de calificación" (Calificación PENDIENTE guardada antes de procesar)', r.data.pendienteCalificacion === true || r.data.calificacion?.estado === 'CALIFICADA');
  r = await part.post(`/participante/inscripciones/${inscId2}/modulos/${mod1}/enviar`, { examen: respuestas });
  check('RF reenviar un módulo ENVIADO → 409 MODULO_ENVIADO', r.status === 409 && r.data.codigo === 'MODULO_ENVIADO');
  r = await part.put(`/participante/inscripciones/${inscId2}/modulos/${mod1}/borrador`, { examen: [] });
  check('guardar borrador sobre un módulo enviado → 409', r.status === 409);
  r = await part.get('/participante/progreso');
  check('la inscripción pasó a EN_CURSO con 50 %', r.data[0].estado === 'EN_CURSO' && r.data[0].porcentaje === 50 && r.data[0].enviados === 1);

  const cal = await hasta(async () => {
    const x = await part.get(`/participante/inscripciones/${inscId2}/modulos/${mod1}`);
    return x.data.calificacion?.estado === 'CALIFICADA' ? x.data : null;
  });
  check('EC-09/CU-07 el worker califica de forma asíncrona (CALIFICADA con puntaje y nivel)', !!cal && cal.calificacion.puntaje >= 0 && ['ALTO', 'MEDIO', 'BAJO'].includes(cal.calificacion.nivel), JSON.stringify(cal?.calificacion));
  if (cal) {
    check('simple correcta (100) + texto libre por IA ⇒ puntaje ponderado coherente', cal.calificacion.puntaje >= 60, `puntaje ${cal.calificacion.puntaje}`);
    r = await part.get(`/participante/progreso/${inscId2}/modulos`);
    const m1 = r.data.find((m) => m.id === mod1);
    check('el estado del módulo muestra el puntaje', m1.estado === 'ENVIADO' && m1.puntaje === cal.calificacion.puntaje && !m1.pendienteCalificacion);
  }
  r = await part.post(`/participante/inscripciones/${inscId2}/modulos/${mod2}/enviar`, { reflexion: { aprendido: 'Aprendí a coordinar equipos.', aplicacion: '' } });
  check('módulo sin test: exige la reflexión completa (campos)', r.status === 400 && r.data.campos['reflexion.aplicacion']);
  r = await part.post(`/participante/inscripciones/${inscId2}/modulos/${mod2}/enviar`, { reflexion: { aprendido: 'Aprendí a coordinar equipos y a medir avances del proyecto cada semana.', aplicacion: 'Lo aplicaré en mi emprendimiento con reuniones semanales y un tablero de tareas.' } });
  check('envía el último módulo → COMPLETADA', r.status === 200);
  r = await hasta(async () => {
    const x = await part.get('/participante/inscripciones?vista=historial');
    return x.data.inscripciones.find((i) => i.id === inscId2 && i.estado === 'COMPLETADA') ? x.data : null;
  });
  check('la inscripción COMPLETADA pasa al Historial con 100 %', !!r && r.inscripciones.find((i) => i.id === inscId2).progreso === 100);

  /* ───────────── CU-11 FE-3 / EC-10 ───────────── */
  seccion('CU-11 FA-4/FE-3 · EC-10 Integridad referencial');
  r = await empA.del(`/empresa/capacitaciones/${capId}`);
  check('FE-3 eliminar con inscripciones activas → 409 TIENE_INSCRITOS', r.status === 409 && r.data.codigo === 'TIENE_INSCRITOS', `status ${r.status}`);
  // Capacitación sin inscritos con módulos, actividades y preguntas → se borra en cascada
  const c2 = (await empA.post('/empresa/capacitaciones', { nombre: 'Para borrar', duracion: 1 })).data.id;
  const m = (await empA.post(`/empresa/capacitaciones/${c2}/modulos`, { nombre: 'M' })).data.id;
  await empA.post(`/empresa/modulos/${m}/actividades`, { tipo: 'TEXTO', titulo: 'T', contenido: '<p>x</p>' });
  await empA.post(`/empresa/modulos/${m}/preguntas`, { tipo: 'CUANTITATIVA', texto: '¿?', peso: 100, valorEsperado: 5, tolerancia: 10 });
  r = await empA.del(`/empresa/capacitaciones/${c2}`);
  check('FA-4 elimina en cascada (204)', r.status === 204);
  check('ya no existe (404)', (await empA.get(`/empresa/capacitaciones/${c2}`)).status === 404);
  const huerfanos = psql(`SELECT (SELECT count(*) FROM actividad a LEFT JOIN modulo m ON m.id=a.modulo_id WHERE m.id IS NULL) + (SELECT count(*) FROM pregunta q LEFT JOIN modulo m ON m.id=q.modulo_id WHERE m.id IS NULL) + (SELECT count(*) FROM modulo m LEFT JOIN capacitacion c ON c.id=m.capacitacion_id WHERE c.id IS NULL)`);
  if (huerfanos !== null) check('EC-10 0 registros huérfanos tras la prueba', huerfanos === '0', `huérfanos: ${huerfanos}`);

  /* ───────────── CU-08 / CU-09 / CU-10 / CU-06 ───────────── */
  seccion('CU-08 Consultar resultados (Administrador)');
  r = await diego.get('/admin/resultados');
  check('dashboard: métricas, distribución y participantes', r.status === 200 && r.data.metricas.participantes >= 5 && r.data.filas.length >= 5 && r.data.distribucion.total > 0, JSON.stringify(r.data.metricas));
  const d = r.data;
  check('solo ve datos de SU Empresa (no aparece Fundamentos de Redes de UTP)', !d.porCapacitacion.some((c) => c.nombre === 'Fundamentos de Redes') && d.filas.every((f) => f.capacitacion !== 'Fundamentos de Redes'));
  check('la capacitación más débil se identifica', d.capacitacionMasDebil === null || typeof d.capacitacionMasDebil.puntaje === 'number');
  const capEmp = d.opciones.capacitaciones.find((c) => c.nombre === 'Emprendimiento Digital');
  r = await diego.get(`/admin/resultados?capacitacionId=${capEmp.id}`);
  check('filtro por capacitación', r.data.filas.length > 0 && r.data.filas.every((f) => f.capacitacion === 'Emprendimiento Digital'));
  r = await diego.get('/admin/resultados?estado=COMPLETADA');
  check('filtro por estado', r.data.filas.every((f) => f.estado === 'COMPLETADA'));
  const coh = d.opciones.cohortes[0];
  r = await diego.get(`/admin/resultados?cohorte=${coh}`);
  check(`filtro por cohorte (${coh})`, r.status === 200 && r.data.filas.every((f) => f.cohorte === coh));
  r = await diego.get('/admin/resultados?desde=2999-01-01');
  check('filtro sin resultados → listas vacías (estado vacío en la UI)', r.status === 200 && r.data.filas.length === 0);
  r = await diego.get('/admin/resultados?cohorte=abc');
  check('filtro inválido → 400', r.status === 400);
  const x = await diego.get('/admin/resultados/exportar', { raw: true });
  const cab = new Uint8Array(x.data).slice(0, 2);
  check('exporta XLSX', x.status === 200 && x.headers.get('content-type').includes('spreadsheetml') && cab[0] === 0x50 && cab[1] === 0x4b && x.data.byteLength > 1000, `status ${x.status}`);
  r = await diego.get(`/admin/resultados/capacitaciones/${capEmp.id}`);
  check('detalle por módulo de una capacitación', r.status === 200 && r.data.modulos.length === 5 && r.data.modulos[0].puntaje !== null);
  r = await adminUtp.get(`/admin/resultados/capacitaciones/${capEmp.id}`);
  check('EC-02 el Administrador de UTP no ve capacitaciones de la Cámara → 404', r.status === 404);
  const ana = d.filas.find((f) => f.participante === 'Ana Torres');
  r = await diego.get(`/admin/participantes/${ana.participanteId}/analisis`);
  check('análisis individual de un participante', r.status === 200 && r.data.promedio >= 80 && r.data.porCapacitacion.length >= 1);
  r = await adminUtp.get(`/admin/participantes/${ana.participanteId}/analisis`);
  check('EC-02 el Administrador de UTP no ve a participantes que no cursan en UTP → 404', r.status === 404);

  seccion('CU-09 Analizar resultados');
  r = await diego.get('/admin/analisis');
  check('evolución por cohorte, decisiones y capacitación más débil/fuerte', r.status === 200 && r.data.evolucion.length >= 2 && r.data.decisiones.length >= 1 && r.data.metricas.totalInscritos > 0, JSON.stringify(r.data.metricas));
  const dec = r.data.decisiones[0];
  await diego.post('/admin/decisiones', { clave: dec.clave, aplicada: true });
  r = await diego.get('/admin/analisis');
  check('«Marcar como aplicada» persiste', r.data.decisiones.find((x) => x.clave === dec.clave).aplicada === true);
  await diego.post('/admin/decisiones', { clave: dec.clave, aplicada: false });

  seccion('CU-10 Entregar feedback · CU-06 Recibir feedback');
  r = await diego.get('/admin/feedback/participantes');
  check('lista de participantes priorizando bajo rendimiento', r.status === 200 && r.data.participantes.length >= 5 && r.data.participantes[0].peorPuntaje <= r.data.participantes[r.data.participantes.length - 2].peorPuntaje, JSON.stringify(r.data.participantes.slice(0, 2)));
  r = await diego.get('/admin/feedback/participantes?q=ana');
  check('búsqueda por nombre', r.data.participantes.length >= 1 && r.data.participantes.every((p) => /ana/i.test(p.nombre)));
  const maria = (await diego.get('/admin/feedback/participantes')).data.participantes[0];
  r = await diego.get(`/admin/feedback/contexto?participanteId=${maria.participanteId}`);
  check('contexto: respuesta clasificada por la IA + historial', r.status === 200 && r.data.respuesta && r.data.respuesta.nivel, JSON.stringify(r.data).slice(0, 200));
  const ctx = r.data;
  r = await diego.post('/admin/feedback', { participanteId: maria.participanteId, capacitacionId: ctx.capacitacionId, texto: '' });
  check('feedback vacío → 400', r.status === 400);
  r = await adminUtp.post('/admin/feedback', { participanteId: maria.participanteId, capacitacionId: ctx.capacitacionId, texto: 'Intruso' });
  check('EC-02 un Administrador de otra Empresa no puede enviar feedback → 404', r.status === 404);
  const texto = `Revisa los conceptos del módulo y vuelve a intentarlo (${sufijo}).`;
  r = await diego.post('/admin/feedback', { participanteId: maria.participanteId, capacitacionId: ctx.capacitacionId, texto });
  check('envía feedback', r.status === 201);
  r = await diego.get(`/admin/feedback/contexto?participanteId=${maria.participanteId}&capacitacionId=${ctx.capacitacionId}`);
  check('el feedback se acumula en el historial', r.data.historial.some((h) => h.texto === texto));
  r = await luis.get('/participante/feedback');
  check('CU-06 Luis ve el feedback de su Administrador (vigentes e históricas)', r.status === 200 && r.data.total >= 2 && r.data.grupos[0].items[0].administrador && r.data.grupos[0].puntaje !== null, JSON.stringify(r.data).slice(0, 200));

  /* ───────────── Superadministrador: gestión de cuentas ───────────── */
  if (process.env.SUPERADMIN_EMAIL) {
    seccion('Superadministrador · gestión de cuentas');
    const sup = nuevoCliente('superadmin');
    r = await sup.post('/auth/login', { email: process.env.SUPERADMIN_EMAIL, password: process.env.SUPERADMIN_PASSWORD });
    check('el superadmin inicia sesión (sin empresa)', r.status === 200 && r.data.rol === 'SUPERADMIN' && r.data.empresaId === null, JSON.stringify(r.data));
    for (const ruta of ['/superadmin/usuarios', '/superadmin/empresas']) {
      for (const cli of [part, diego, empCamara]) {
        const x = await cli.get(ruta);
        check(`${cli.nombre} → GET ${ruta} = 403`, x.status === 403, `status ${x.status}`);
      }
    }
    for (const ruta of ['/admin/resultados', '/empresa/capacitaciones', '/participante/inscripciones', '/admin/feedback/participantes']) {
      const x = await sup.get(ruta);
      check(`el superadmin NO accede a datos de empresas: GET ${ruta} = 403`, x.status === 403, `status ${x.status}`);
    }
    r = await sup.get('/superadmin/usuarios');
    check('lista cuentas de todos los roles', r.status === 200 && r.data.length >= 15 && ['PARTICIPANTE', 'EMPRESA', 'ADMINISTRADOR', 'SUPERADMIN'].every((rol) => r.data.some((u) => u.rol === rol)));
    r = await sup.get('/superadmin/usuarios?q=redes&rol=ADMINISTRADOR');
    check('filtra por texto y rol', r.data.length === 1 && r.data[0].rol === 'ADMINISTRADOR');
    r = await sup.get('/superadmin/empresas');
    check('lista empresas con sus conteos', r.status === 200 && r.data.some((e) => e.nombre === 'Cámara de Comercio' && e.usuarios >= 2 && e.capacitaciones >= 5));
    const camara = r.data.find((e) => e.nombre === 'Cámara de Comercio');

    const nuevoEmail = `nuevo-${sufijo}@prueba.co`;
    r = await sup.post('/superadmin/usuarios', { rol: 'ADMINISTRADOR', nombre: 'Admin Nuevo', email: nuevoEmail, password: 'Inicial2026!' });
    check('administrador sin empresa → 400 con mensaje junto al campo', r.status === 400 && r.data.campos.empresaId);
    r = await sup.post('/superadmin/usuarios', { rol: 'ADMINISTRADOR', nombre: 'Admin Nuevo', email: nuevoEmail, password: 'Inicial2026!', empresaId: camara.id });
    check('crea un Administrador en una empresa', r.status === 201 && r.data.empresaId === camara.id && r.data.activo === true);
    const nuevoId = r.data.id;
    r = await sup.post('/superadmin/usuarios', { rol: 'PARTICIPANTE', nombre: 'Dup', email: nuevoEmail, password: 'Inicial2026!' });
    check('correo duplicado → 409', r.status === 409 && r.data.codigo === 'EMAIL_DUPLICADO');
    r = await sup.post('/superadmin/usuarios', { rol: 'EMPRESA', nombre: 'Dueña', email: `emp-${sufijo}@prueba.co`, password: 'Inicial2026!', empresaNombre: `Nueva Org ${sufijo}`, empresaTipo: 'banco' });
    check('crea una Empresa nueva junto con su primera cuenta', r.status === 201 && r.data.rol === 'EMPRESA' && r.data.empresaNombre === `Nueva Org ${sufijo}`);
    const empId = r.data.id;
    r = await sup.post('/superadmin/usuarios', { rol: 'SUPERADMIN', nombre: 'Otro Super', email: `sup2-${sufijo}@prueba.co`, password: 'Inicial2026!' });
    check('crea otro Superadministrador', r.status === 201 && r.data.empresaId === null);
    const sup2Id = r.data.id;

    // La cuenta nueva funciona; al desactivarla pierde acceso de inmediato
    const adminNuevo = nuevoCliente('admin nuevo');
    r = await adminNuevo.post('/auth/login', { email: nuevoEmail, password: 'Inicial2026!' });
    check('la cuenta nueva inicia sesión', r.status === 200 && r.data.rol === 'ADMINISTRADOR');
    check('y ve los resultados de SU empresa', (await adminNuevo.get('/admin/resultados')).status === 200);
    r = await sup.patch(`/superadmin/usuarios/${nuevoId}`, { activo: false });
    check('desactiva la cuenta', r.status === 200 && r.data.activo === false);
    r = await adminNuevo.get('/admin/resultados');
    check('su sesión abierta deja de servir (401)', r.status === 401, `status ${r.status}`);
    r = await nuevoCliente('x').post('/auth/login', { email: nuevoEmail, password: 'Inicial2026!' });
    check('no puede volver a entrar → 403 CUENTA_DESACTIVADA', r.status === 403 && r.data.codigo === 'CUENTA_DESACTIVADA');
    await sup.patch(`/superadmin/usuarios/${nuevoId}`, { activo: true });

    // Contraseña
    r = await sup.post(`/superadmin/usuarios/${nuevoId}/password`, { password: 'corta' });
    check('contraseña corta → 400', r.status === 400 && r.data.campos.password);
    r = await sup.post(`/superadmin/usuarios/${nuevoId}/password`, { password: 'Cambiada2026!' });
    check('cambia la contraseña (204)', r.status === 204);
    check('la contraseña vieja ya no sirve', (await nuevoCliente('x').post('/auth/login', { email: nuevoEmail, password: 'Inicial2026!' })).status === 401);
    check('la nueva sí', (await nuevoCliente('x').post('/auth/login', { email: nuevoEmail, password: 'Cambiada2026!' })).status === 200);

    // Salvaguardas
    const yo = (await sup.get('/auth/me')).data;
    r = await sup.patch(`/superadmin/usuarios/${yo.id}`, { activo: false });
    check('no puede desactivarse a sí mismo → 409', r.status === 409 && r.data.codigo === 'OPERACION_NO_PERMITIDA');
    r = await sup.del(`/superadmin/usuarios/${yo.id}`);
    check('no puede eliminarse a sí mismo → 409', r.status === 409);
    const luisId = (await sup.get('/superadmin/usuarios?q=luis.perez')).data[0].id;
    const diegoId = (await sup.get('/superadmin/usuarios?q=diego.ramirez')).data[0].id;
    r = await sup.del(`/superadmin/usuarios/${diegoId}`);
    check('un administrador que ya dio feedback no se elimina (se desactiva) → 409', r.status === 409);

    // Eliminación (cascada controlada) — con un participante propio de la prueba
    const pEmail = `elim-${sufijo}@prueba.co`;
    const pElim = nuevoCliente('a eliminar');
    await pElim.post('/auth/registro', { rol: 'PARTICIPANTE', nombre: 'A Eliminar', email: pEmail, password: PASS });
    const catalogoElim = (await pElim.get('/catalogo?page=1')).data.items[0];
    await pElim.post('/participante/inscripciones', { capacitacionId: catalogoElim.capacitacionId });
    const pElimId = (await sup.get(`/superadmin/usuarios?q=${pEmail}`)).data[0].id;
    r = await sup.del(`/superadmin/usuarios/${pElimId}`);
    check('elimina un participante con inscripciones (204)', r.status === 204);
    check('ya no existe y su sesión murió', (await sup.get(`/superadmin/usuarios?q=${pEmail}`)).data.length === 0 && (await pElim.get('/participante/inscripciones')).status === 401);
    const huerf = psql(`SELECT count(*) FROM inscripcion i LEFT JOIN usuario u ON u.id=i.participante_id WHERE u.id IS NULL`);
    if (huerf !== null) check('0 inscripciones huérfanas tras eliminar', huerf === '0', `huérfanas: ${huerf}`);
    check('Luis sigue intacto', (await sup.get('/superadmin/usuarios?q=luis.perez')).data[0]?.id === luisId);

    // Limpieza de lo creado en la prueba
    for (const id of [nuevoId, empId, sup2Id]) await sup.del(`/superadmin/usuarios/${id}`);
    const restantes = (await Promise.all([`nuevo-${sufijo}`, `emp-${sufijo}`, `sup2-${sufijo}`].map((e) => sup.get(`/superadmin/usuarios?q=${e}`)))).flatMap((x) => x.data);
    check('limpia las cuentas de prueba', restantes.length === 0, JSON.stringify(restantes.map((u) => u.email)));
  }

  /* ───────────── EC-03 / límite de intentos ───────────── */
  seccion('EC-03 Contraseñas con hash · límite de intentos');
  const planas = psql(`SELECT count(*) FROM usuario WHERE password_hash !~ '^\\$2[aby]\\$12\\$'`);
  if (planas !== null) check('EC-03 100 % de contraseñas con hash bcrypt (costo 12)', planas === '0', `sin hash: ${planas}`);
  const t = nuevoCliente('fuerza bruta');
  const intentos = [];
  const limiteLogin = Number(process.env.LOGIN_THROTTLE_LIMIT ?? 10);
  for (let i = 0; i < limiteLogin + 6; i++) intentos.push((await t.post('/auth/login', { email: 'nadie@nada.co', password: 'x' })).status);
  check('límite de intentos en /auth/login → 429', intentos.includes(429), intentos.join(','));
  const cuerpo429 = await t.post('/auth/login', { email: 'nadie@nada.co', password: 'x' });
  check('el 429 usa el formato { codigo, mensaje, campos }', cuerpo429.data.codigo === 'DEMASIADOS_INTENTOS' && cuerpo429.data.campos !== undefined);

  console.log(`\n${fallos ? rojo(`✘ ${fallos} verificaciones fallaron`) : verde('✔ Todo correcto')} · ${ok} correctas`);
  process.exit(fallos ? 1 : 0);
}

/** Consulta directa a PostgreSQL (solo si hay Docker); devuelve null si no es posible. */
function psql(sql) {
  try {
    return execSync(`docker compose exec -T postgres psql -U regicap -d regicap -tA -c ${JSON.stringify(sql)}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return null;
  }
}

main().catch((e) => {
  console.error(rojo('\nError inesperado:'), e);
  process.exit(1);
});
