/* ===================================================================
   REGICAP — store.js
   Capa de persistencia (localStorage) + queries derivadas + mutaciones.
   Es la única fuente de verdad que leen las 3 páginas de rol — por eso
   dos pestañas abiertas en distintos roles ven siempre el mismo dato.
   =================================================================== */

const DB_KEY = 'regicap_db';
const SESSION_KEY = 'regicap_session';

/* ============ PERSISTENCIA ============ */
function loadDB(){
  const raw = localStorage.getItem(DB_KEY);
  if(!raw){
    const fresh = structuredClone(SEED_DATA);
    localStorage.setItem(DB_KEY, JSON.stringify(fresh));
    return fresh;
  }
  return JSON.parse(raw);
}
function saveDB(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); }
function resetDemo(){
  localStorage.removeItem(DB_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  location.href = 'index.html';
}
function uid(prefix){ return prefix + '-' + Math.random().toString(36).slice(2, 8); }
function today(){ return new Date().toISOString().slice(0, 10); }
function byId(list, id){ return list.find(x => x.id === id); }

/* ============ SESIÓN ============ */
function login(role){
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ role, entityId: SESSION_IDENTITIES[role].id }));
}
function logout(){
  sessionStorage.removeItem(SESSION_KEY);
  location.href = 'index.html';
}
function getSession(){
  const raw = sessionStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}
function requireSession(expectedRole){
  const s = getSession();
  if(!s || s.role !== expectedRole){ location.href = 'index.html'; return null; }
  return s;
}
function getEmpresaActual(){ const s = getSession(); return s ? byId(loadDB().empresas, s.entityId) : null; }
function getParticipanteActual(){ const s = getSession(); return s ? byId(loadDB().participantes, s.entityId) : null; }
function getAdministradorActual(){ const s = getSession(); return s ? byId(loadDB().administradores, s.entityId) : null; }

/* ============ QUERIES: catálogo / jerarquía de contenido ============ */
function getCapacitacion(id){ return byId(loadDB().capacitaciones, id); }
function getModulo(id){ return byId(loadDB().modulos, id); }
function getCapitulo(id){ return byId(loadDB().capitulos, id); }
function getPregunta(id){ return byId(loadDB().preguntas, id); }
function getParticipante(id){ return byId(loadDB().participantes, id); }
function getEmpresaById(id){ return byId(loadDB().empresas, id); }

function getModulosDe(capacitacionId){
  return loadDB().modulos.filter(m => m.capacitacionId === capacitacionId).sort((a, b) => a.orden - b.orden);
}
function getCapitulosDe(moduloId){
  return loadDB().capitulos.filter(c => c.moduloId === moduloId).sort((a, b) => a.orden - b.orden);
}
function getPreguntasDe(moduloId){
  return loadDB().preguntas.filter(q => q.moduloId === moduloId);
}
/* Preguntas que se evalúan en un módulo. Un módulo de contenido usa sus
   propias preguntas; un módulo de tipo 'test' (evaluación final) reúne las
   preguntas de todos los módulos de contenido del curso y además sus propias
   preguntas nuevas (exclusivas de la evaluación final). */
function preguntasEvaluacion(db, modulo){
  if(modulo && modulo.tipo === 'test'){
    const deContenido = db.modulos
      .filter(m => m.capacitacionId === modulo.capacitacionId && m.tipo !== 'test')
      .sort((a, b) => a.orden - b.orden)
      .flatMap(m => db.preguntas.filter(q => q.moduloId === m.id));
    const propias = db.preguntas.filter(q => q.moduloId === modulo.id);
    return [...deContenido, ...propias];
  }
  return db.preguntas.filter(q => q.moduloId === (modulo ? modulo.id : null));
}
function getPreguntasEvaluacion(moduloId){
  const db = loadDB();
  return preguntasEvaluacion(db, byId(db.modulos, moduloId));
}
function esModuloTest(moduloId){
  const m = byId(loadDB().modulos, moduloId);
  return !!(m && m.tipo === 'test');
}
function getCapacitacionesDeEmpresa(empresaId){
  return loadDB().capacitaciones.filter(c => c.empresaId === empresaId);
}
function getCapacitacionesPublicadas(){
  return loadDB().capacitaciones.filter(c => c.estado === 'publicada');
}
function getCatalogoPublicado(participanteId){
  const db = loadDB();
  const noDisponibles = new Set(db.inscripciones.filter(i => i.participanteId === participanteId && i.estado !== 'cancelada').map(i => i.capacitacionId));
  return db.capacitaciones.filter(c => c.estado === 'publicada' && !noDisponibles.has(c.id));
}

/* ============ QUERIES: inscripciones (CU-1 / CU-2) ============ */
function getInscripcionesActivas(participanteId){
  const db = loadDB();
  return db.inscripciones
    .filter(i => i.participanteId === participanteId && (i.estado === 'pendiente' || i.estado === 'en_curso'))
    .map(i => ({ ...i, capacitacion: byId(db.capacitaciones, i.capacitacionId) }));
}
function getHistorialInscripciones(participanteId){
  const db = loadDB();
  return db.inscripciones
    .filter(i => i.participanteId === participanteId && (i.estado === 'completada' || i.estado === 'cancelada'))
    .map(i => ({ ...i, capacitacion: byId(db.capacitaciones, i.capacitacionId) }));
}
function getInscripcion(participanteId, capacitacionId){
  return loadDB().inscripciones.find(i => i.participanteId === participanteId && i.capacitacionId === capacitacionId);
}

/* ============ QUERIES: respuestas / calificaciones ============ */
function getRespuestaConCalificacion(participanteId, moduloId){
  const db = loadDB();
  const r = db.respuestas.find(x => x.participanteId === participanteId && x.moduloId === moduloId);
  if(!r) return null;
  return { respuesta: r, calificacion: db.calificaciones.find(c => c.respuestaId === r.id) || null };
}

/* ============ CÁLCULOS AGREGADOS (nunca hardcodeados — ver DATA_MODEL.md) ============ */
function computeNivel(score){ return score >= 80 ? 'alto' : score >= 60 ? 'medio' : 'bajo'; }

function computeScoreParticipanteCapacitacion(participanteId, capacitacionId){
  const db = loadDB();
  const modulosCap = new Set(db.modulos.filter(m => m.capacitacionId === capacitacionId).map(m => m.id));
  const puntajes = db.respuestas
    .filter(r => r.participanteId === participanteId && r.estado === 'enviada' && modulosCap.has(r.moduloId))
    .map(r => db.calificaciones.find(c => c.respuestaId === r.id))
    .filter(Boolean).map(c => c.puntaje);
  return puntajes.length ? Math.round(puntajes.reduce((a, b) => a + b, 0) / puntajes.length) : null;
}
function computeScoreModulo(moduloId){
  const db = loadDB();
  const puntajes = db.respuestas.filter(r => r.moduloId === moduloId && r.estado === 'enviada')
    .map(r => db.calificaciones.find(c => c.respuestaId === r.id)).filter(Boolean).map(c => c.puntaje);
  return puntajes.length ? Math.round(puntajes.reduce((a, b) => a + b, 0) / puntajes.length) : null;
}
function computeScoreCapacitacion(capacitacionId){
  const db = loadDB();
  const participantesIds = [...new Set(db.inscripciones
    .filter(i => i.capacitacionId === capacitacionId && (i.estado === 'en_curso' || i.estado === 'completada'))
    .map(i => i.participanteId))];
  const scores = participantesIds.map(pid => computeScoreParticipanteCapacitacion(pid, capacitacionId)).filter(s => s !== null);
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}
function getParticipantesDeCapacitacion(capacitacionId){
  const db = loadDB();
  return db.inscripciones.filter(i => i.capacitacionId === capacitacionId && i.estado !== 'cancelada').map(i => {
    const score = computeScoreParticipanteCapacitacion(i.participanteId, capacitacionId);
    return { participante: byId(db.participantes, i.participanteId), inscripcion: i, score, nivel: score !== null ? computeNivel(score) : null };
  });
}
function getTablaGlobalParticipantes(){
  const db = loadDB();
  return db.inscripciones.filter(i => i.estado !== 'cancelada').map(i => {
    const score = computeScoreParticipanteCapacitacion(i.participanteId, i.capacitacionId);
    return {
      participante: byId(db.participantes, i.participanteId),
      capacitacion: byId(db.capacitaciones, i.capacitacionId),
      inscripcion: i, score, nivel: score !== null ? computeNivel(score) : null,
    };
  });
}
function computeDistribucionGlobal(){
  const db = loadDB();
  let alto = 0, medio = 0, bajo = 0;
  db.inscripciones.filter(i => i.estado === 'en_curso' || i.estado === 'completada').forEach(i => {
    const score = computeScoreParticipanteCapacitacion(i.participanteId, i.capacitacionId);
    if(score === null) return;
    const nivel = computeNivel(score);
    if(nivel === 'alto') alto++; else if(nivel === 'medio') medio++; else bajo++;
  });
  return { alto, medio, bajo, total: alto + medio + bajo };
}
function computeCohortes(){
  const db = loadDB();
  return db.cohortes.map(co => {
    if(!co.actual) return co;
    const scores = [];
    db.inscripciones.filter(i => i.estado === 'en_curso' || i.estado === 'completada').forEach(i => {
      const s = computeScoreParticipanteCapacitacion(i.participanteId, i.capacitacionId);
      if(s !== null) scores.push(s);
    });
    const promedio = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : co.scorePromedio;
    return { ...co, scorePromedio: promedio };
  });
}
function getCapacitacionExtremos(){
  const scored = loadDB().capacitaciones.filter(c => c.estado === 'publicada')
    .map(c => ({ cap: c, score: computeScoreCapacitacion(c.id) })).filter(x => x.score !== null);
  if(!scored.length) return { debil: null, fuerte: null };
  return {
    debil: scored.reduce((min, x) => x.score < min.score ? x : min),
    fuerte: scored.reduce((max, x) => x.score > max.score ? x : max),
  };
}

/* ============ SIMULACIÓN DE CU-4 (IA — sin interfaz propia) ============
   Implementa los cálculos de context.md por tipo de pregunta:
   simple → comparación exacta · cuantitativa → tolerancia sobre el valor
   esperado · compuesta/texto libre/cualitativa → heurística determinística
   basada en la respuesta (no hay motor de NLP real en un mockup estático). */
function simularCalificacionIA(contenidoCrudo, preguntas){
  let data = null;
  try { data = JSON.parse(contenidoCrudo); } catch(e) { /* texto plano, sin examen */ }

  if(!data || !data.examen || !preguntas.length){
    const texto = (data && data.reflexion ? Object.values(data.reflexion).join(' ') : contenidoCrudo || '').trim();
    const puntaje = Math.max(0, Math.min(100, 50 + Math.min(45, Math.floor(texto.length / 6))));
    return { puntaje, criterioMasBajo: puntaje < 70 ? 'profundidad' : '—' };
  }

  let sumaPonderada = 0, sumaPesos = 0, peor = null;
  preguntas.forEach(p => {
    const respuesta = data.examen.find(e => e.preguntaId === p.id);
    const valor = respuesta ? respuesta.valor : '';
    let score;
    if(p.tipo === 'simple'){
      score = valor === p.respuestaCorrecta ? 100 : 0;
    } else if(p.tipo === 'cuantitativa'){
      const num = Number(valor);
      if(Number.isNaN(num)) score = 0;
      else {
        const errorPct = Math.abs(num - p.valorEsperado) / p.valorEsperado * 100;
        score = errorPct <= p.tolerancia ? 100 : Math.max(0, 100 - (errorPct - p.tolerancia) * 2);
      }
    } else if(p.tipo === 'compuesta'){
      const subValores = Array.isArray(valor) ? valor : [];
      const pesosSub = p.subItems.reduce((a, s) => a + s.peso, 0) || 1;
      score = p.subItems.reduce((acc, sub, i) => {
        const texto = (subValores[i] || '').trim();
        const subScore = Math.max(0, Math.min(100, 40 + Math.floor(texto.length / 4)));
        return acc + subScore * (sub.peso / pesosSub);
      }, 0);
    } else { /* texto_libre | cualitativa */
      const texto = (valor || '').trim();
      score = Math.max(0, Math.min(100, 45 + Math.min(50, Math.floor(texto.length / 5))));
    }
    sumaPonderada += score * p.peso;
    sumaPesos += p.peso;
    if(peor === null || score < peor.score) peor = { score, texto: p.texto };
  });
  const puntaje = sumaPesos ? Math.round(sumaPonderada / sumaPesos) : 0;
  return { puntaje, criterioMasBajo: peor && puntaje < 90 ? peor.texto : '—' };
}

/* ============ MUTACIONES: Participante (CU-1 / CU-2 / CU-3) ============ */
function inscribirParticipante(participanteId, capacitacionId){
  const db = loadDB();
  const existente = db.inscripciones.find(i => i.participanteId === participanteId && i.capacitacionId === capacitacionId);
  if(existente) existente.estado = 'pendiente';
  else db.inscripciones.push({ id: uid('i'), participanteId, capacitacionId, estado: 'pendiente', fechaInscripcion: today() });
  saveDB(db);
}
function cancelarInscripcion(inscripcionId){
  const db = loadDB();
  const insc = byId(db.inscripciones, inscripcionId);
  if(insc && insc.estado === 'pendiente'){ insc.estado = 'cancelada'; saveDB(db); }
}
function upsertRespuesta(db, participanteId, moduloId, contenido, estado){
  let r = db.respuestas.find(x => x.participanteId === participanteId && x.moduloId === moduloId);
  if(r){ r.contenido = contenido; r.estado = estado; r.fechaEnvio = today(); }
  else { r = { id: uid('r'), participanteId, moduloId, contenido, entregable: null, estado, fechaEnvio: today() }; db.respuestas.push(r); }
  return r;
}
function guardarBorrador(participanteId, moduloId, contenido){
  const db = loadDB();
  upsertRespuesta(db, participanteId, moduloId, contenido, 'borrador');
  saveDB(db);
}
function enviarRespuesta(participanteId, moduloId, contenido){
  const db = loadDB();
  const respuesta = upsertRespuesta(db, participanteId, moduloId, contenido, 'enviada');
  db.calificaciones = db.calificaciones.filter(c => c.respuestaId !== respuesta.id);
  const modulo = byId(db.modulos, moduloId);
  const preguntas = preguntasEvaluacion(db, modulo);
  const { puntaje, criterioMasBajo } = simularCalificacionIA(contenido, preguntas);
  db.calificaciones.push({ id: uid('cal'), respuestaId: respuesta.id, puntaje, nivel: computeNivel(puntaje), criterioMasBajo, fecha: today() });

  const inscripcion = db.inscripciones.find(i => i.participanteId === participanteId && i.capacitacionId === modulo.capacitacionId);
  if(inscripcion){
    const modulosCap = db.modulos.filter(m => m.capacitacionId === modulo.capacitacionId);
    const enviadas = db.respuestas.filter(r => r.participanteId === participanteId && r.estado === 'enviada' && modulosCap.some(m => m.id === r.moduloId));
    inscripcion.estado = enviadas.length >= modulosCap.length ? 'completada' : 'en_curso';
  }
  saveDB(db);
}

/* ============ MUTACIONES: Empresa (CU-8 / CU-9) ============ */
function crearCapacitacion(empresaId, { nombre, duracion }){
  const db = loadDB();
  const nueva = { id: uid('c'), empresaId, nombre, duracion: duracion || 'Por definir', estado: 'borrador', createdAt: today() };
  db.capacitaciones.push(nueva);
  saveDB(db);
  return nueva;
}
function editarCapacitacion(capacitacionId, data){
  const db = loadDB();
  const c = byId(db.capacitaciones, capacitacionId);
  if(c){ Object.assign(c, data); saveDB(db); }
}
function eliminarCapacitacion(capacitacionId){
  const db = loadDB();
  const modIds = db.modulos.filter(m => m.capacitacionId === capacitacionId).map(m => m.id);
  db.capacitaciones = db.capacitaciones.filter(c => c.id !== capacitacionId);
  db.modulos = db.modulos.filter(m => m.capacitacionId !== capacitacionId);
  db.capitulos = db.capitulos.filter(c => !modIds.includes(c.moduloId));
  db.preguntas = db.preguntas.filter(q => !modIds.includes(q.moduloId));
  saveDB(db);
}
function setEstadoCapacitacion(capacitacionId, estado){
  const db = loadDB();
  const c = byId(db.capacitaciones, capacitacionId);
  if(c){ c.estado = estado; saveDB(db); }
}
function publicarCapacitacion(id){ setEstadoCapacitacion(id, 'publicada'); }
function despublicarCapacitacion(id){ setEstadoCapacitacion(id, 'despublicada'); }

function crearModulo(capacitacionId, nombre, tipo){
  const db = loadDB();
  const orden = db.modulos.filter(m => m.capacitacionId === capacitacionId).length + 1;
  const nuevo = { id: uid('m'), capacitacionId, nombre, orden, tipo: tipo || 'contenido' };
  db.modulos.push(nuevo);
  saveDB(db);
  return nuevo;
}
/* Un curso solo puede tener un módulo de evaluación final (tipo 'test'). */
function tieneModuloTest(capacitacionId){
  return loadDB().modulos.some(m => m.capacitacionId === capacitacionId && m.tipo === 'test');
}
function eliminarModulo(moduloId){
  const db = loadDB();
  db.modulos = db.modulos.filter(m => m.id !== moduloId);
  db.capitulos = db.capitulos.filter(c => c.moduloId !== moduloId);
  db.preguntas = db.preguntas.filter(q => q.moduloId !== moduloId);
  saveDB(db);
}
function moverModulo(moduloId, direction){
  const db = loadDB();
  const mod = byId(db.modulos, moduloId);
  if(!mod) return;
  const hermanos = db.modulos.filter(m => m.capacitacionId === mod.capacitacionId).sort((a, b) => a.orden - b.orden);
  const idx = hermanos.findIndex(m => m.id === moduloId);
  const swapIdx = idx + direction;
  if(swapIdx < 0 || swapIdx >= hermanos.length) return;
  const tmp = hermanos[idx].orden;
  hermanos[idx].orden = hermanos[swapIdx].orden;
  hermanos[swapIdx].orden = tmp;
  saveDB(db);
}
function agregarCapitulo(moduloId, { titulo, tipo, contenido }){
  const db = loadDB();
  const orden = db.capitulos.filter(c => c.moduloId === moduloId).length + 1;
  db.capitulos.push({ id: uid('cap'), moduloId, titulo, tipo, contenido, orden });
  saveDB(db);
}
function editarCapitulo(capituloId, data){
  const db = loadDB();
  const c = byId(db.capitulos, capituloId);
  if(c){ Object.assign(c, data); saveDB(db); }
}
function eliminarCapitulo(capituloId){
  const db = loadDB();
  db.capitulos = db.capitulos.filter(c => c.id !== capituloId);
  saveDB(db);
}
function agregarPregunta(moduloId, data){
  const db = loadDB();
  db.preguntas.push(Object.assign({ id: uid('q'), moduloId }, data));
  saveDB(db);
}
function eliminarPregunta(preguntaId){
  const db = loadDB();
  db.preguntas = db.preguntas.filter(q => q.id !== preguntaId);
  saveDB(db);
}

/* ============ MUTACIONES: Administrador (CU-6 / CU-7) ============ */
function getDecisiones(){ return loadDB().decisiones; }
function toggleDecision(decisionId){
  const db = loadDB();
  const d = byId(db.decisiones, decisionId);
  if(d){ d.aplicada = !d.aplicada; saveDB(db); }
}
function buscarParticipantes(query){
  const db = loadDB();
  const q = (query || '').toLowerCase().trim();
  return q ? db.participantes.filter(p => p.nombre.toLowerCase().includes(q)) : db.participantes;
}
function getFeedbackDe(participanteId, capacitacionId){
  const db = loadDB();
  return db.feedbacks
    .filter(f => f.participanteId === participanteId && (!capacitacionId || f.capacitacionId === capacitacionId))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}
function enviarFeedback(administradorId, participanteId, capacitacionId, texto){
  const db = loadDB();
  db.feedbacks.push({ id: uid('f'), administradorId, participanteId, capacitacionId, texto, fecha: today() });
  saveDB(db);
}
