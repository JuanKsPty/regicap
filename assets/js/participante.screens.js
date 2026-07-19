/* ===================================================================
   REGICAP — pantallas del Participante
   CU-1 (administrar capacitaciones), CU-2 (recibir feedback, pantalla
   propia) y CU-3 (tomar capacitaciones).
   =================================================================== */

MENU = [
  { sec: 'Principal', items: [
    { id: 'gestionar', label: 'Administrar capacitaciones', icon: 'module' },
    { id: 'tomar', label: 'Tomar capacitaciones', icon: 'proc' },
    { id: 'feedback', label: 'Recibir feedback', icon: 'feedback' },
  ] },
];
TITLES = { gestionar: 'Administrar capacitaciones', tomar: 'Tomar capacitaciones', feedback: 'Recibir feedback' };

let tabGestionar = 'activas';
let capSeleccionada = null;
let moduloAbierto = null;
let capituloAbierto = null;

/* archivos PDF de ejemplo que sí existen en assets/pdfs/ — cualquier otro
   nombre de archivo (p. ej. uno que la Empresa escriba a mano en CU-9)
   cae al placeholder de "vista previa no disponible". */
const PDFS_DISPONIBLES = new Set([
  'guia-entrevistas.pdf', 'calendario-contenido.pdf', 'manual-venta-consultiva.pdf', 'archivo.pdf',
  'redes-ip-direccionamiento.pdf', 'redes-switch-basico.pdf', 'redes-switch-vlan.pdf',
  'redes-router-enrutamiento.pdf', 'redes-router-estatico.pdf', 'redes-router-dinamico.pdf',
]);
function youtubeEmbedUrl(url){
  const m = (url || '').match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/);
  return `https://www.youtube.com/embed/${m ? m[1] : ''}`;
}

/* ---- CU-1: administrar capacitaciones ---- */
function setTabGestionar(tab){ tabGestionar = tab; navigate('gestionar'); }
function inscribirseYRefrescar(capId){ inscribirParticipante(getParticipanteActual().id, capId); navigate('gestionar'); }
function cancelarYRefrescar(inscId){ cancelarInscripcion(inscId); navigate('gestionar'); }

function capCard(insc){
  const cap = insc.capacitacion;
  const participanteId = insc.participanteId;
  const modulos = getModulosDe(cap.id);
  const enviadas = modulos.filter(m => getRespuestaConCalificacion(participanteId, m.id)?.respuesta.estado === 'enviada').length;
  const pct = modulos.length ? Math.round(enviadas / modulos.length * 100) : 0;
  const empresa = getEmpresaById(cap.empresaId);
  const barCol = insc.estado === 'completada' ? COLORS.alto : COLORS.accent;
  const noteTxt = insc.estado === 'completada' ? 'Finalizada'
    : insc.estado === 'cancelada' ? 'Inscripción cancelada'
    : insc.estado === 'en_curso' ? 'Continúa en Tomar capacitaciones →'
    : 'Aún no iniciada';

  return `<div class="card" style="margin-bottom:10px">
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px">
      <div><div class="label-upper">${empresa.nombre}</div>
        <div class="m-name" style="font-size:13px; font-weight:600">${cap.nombre}</div></div>
      ${estadoInscripcionPill(insc.estado)}
    </div>
    ${insc.estado !== 'cancelada' ? `<div class="progress"><span style="width:${pct}%; background:${barCol}"></span></div>` : ''}
    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; gap:8px; flex-wrap:wrap">
      <span class="txt-3" style="font-size:10px; font-style:italic">${noteTxt}</span>
      <div style="display:flex; gap:6px">
        ${insc.estado === 'pendiente' ? `<button class="btn" style="padding:4px 10px" onclick="cancelarYRefrescar('${insc.id}')">Cancelar inscripción</button>` : ''}
        ${(insc.estado === 'en_curso' || insc.estado === 'pendiente') ? `<button class="btn btn-primary" style="padding:4px 10px" onclick="abrirTomar('${cap.id}')">Continuar →</button>` : ''}
      </div>
    </div>
  </div>`;
}

SCREENS.gestionar = () => {
  const participanteId = getParticipanteActual().id;
  const activas = getInscripcionesActivas(participanteId);
  const historial = getHistorialInscripciones(participanteId);
  const catalogo = getCatalogoPublicado(participanteId);
  const completadas = historial.filter(h => h.estado === 'completada').length;
  const lista = tabGestionar === 'activas' ? activas : historial;

  return `
  <div class="grid-3">
    ${metric('Capacitaciones matriculadas', activas.length + completadas, 'activas y completadas', '', '')}
    ${metric('Pendientes por completar', activas.length, 'requieren tu atención', '', '')}
    ${metric('Completadas', completadas, 'finalizadas con éxito', '', '')}
  </div>

  <div class="section-gap">
    <div class="seg-wrap" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
      <span class="label-upper">Mis capacitaciones</span>
      ${tabsHtml([{ id: 'activas', label: 'Activas' }, { id: 'historial', label: 'Historial' }], tabGestionar, 'setTabGestionar')}
    </div>
    ${lista.length ? lista.map(insc => capCard(insc)).join('')
      : `<div class="card txt-3" style="text-align:center; padding:24px">${tabGestionar === 'activas' ? 'No tienes capacitaciones activas. Explora el catálogo abajo.' : 'Aún no tienes capacitaciones en tu historial.'}</div>`}
  </div>

  <div class="section-gap">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
      <span class="label-upper">Capacitaciones disponibles</span>
      <span class="chip">Datos obtenidos de proveedores externos</span>
    </div>
    ${catalogo.length ? `<div class="grid-3">${catalogo.map(c => `
        <div class="card" style="display:flex; flex-direction:column; gap:8px">
          <div class="label-upper">${getEmpresaById(c.empresaId).nombre}</div>
          <div class="m-name" style="font-size:13px; font-weight:600">${c.nombre}</div>
          <div class="txt-3" style="font-size:10px">${getModulosDe(c.id).length} módulos · ${c.duracion}</div>
          <button class="btn btn-primary" style="margin-top:auto" onclick="inscribirseYRefrescar('${c.id}')">Inscribirme →</button>
        </div>`).join('')}</div>`
      : `<div class="card txt-3" style="text-align:center; padding:24px">Ya estás inscrito en todas las capacitaciones publicadas.</div>`}
  </div>`;
};

/* ---- CU-2: recibir feedback (retroalimentación del Administrador) ---- */
SCREENS.feedback = () => {
  const participanteId = getParticipanteActual().id;
  const feedbacks = getFeedbackDe(participanteId);
  const capIds = [...new Set(feedbacks.map(f => f.capacitacionId))];

  return `
  <div class="grid-3">
    ${metric('Feedback recibido', feedbacks.length, 'mensajes de tu administrador', '', '')}
    ${metric('Capacitaciones con feedback', capIds.length, 'con retroalimentación', '', '')}
    ${metric('Último feedback', feedbacks.length ? fmtFecha(feedbacks[0].fecha) : '—', 'fecha más reciente', '', '')}
  </div>

  <div class="section-gap">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
      <span class="label-upper">Retroalimentación sobre tu resultado final</span>
      <span class="chip">El feedback corresponde al resultado final del curso</span>
    </div>
    ${feedbacks.length ? capIds.map(capId => {
        const cap = getCapacitacion(capId);
        const empresa = getEmpresaById(cap.empresaId);
        const items = feedbacks.filter(f => f.capacitacionId === capId);
        const score = computeScoreParticipanteCapacitacion(participanteId, capId);
        const nivel = score !== null ? computeNivel(score) : null;
        return `<div class="card" style="margin-bottom:10px">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:8px">
            <div>
              <div class="label-upper">${empresa.nombre}</div>
              <div class="m-name" style="font-size:13px; font-weight:600">${cap.nombre}</div>
            </div>
            <div style="text-align:right; flex:none">
              <div class="txt-3" style="font-size:9px; text-transform:uppercase; letter-spacing:.4px">Resultado final</div>
              <div style="display:flex; align-items:center; gap:6px; justify-content:flex-end; margin-top:3px">
                <span style="font-size:16px; font-weight:700; color:${nivel ? barColor(score) : 'var(--text-3)'}">${score ?? '—'}${score !== null ? ' pts' : ''}</span>
                ${pillFor(nivel)}
              </div>
            </div>
          </div>
          <div class="fb-panel">
            ${items.map(f => `<div class="fb-item">
              <div class="txt-2" style="font-size:11px">${f.texto}</div>
              <div class="txt-3" style="font-size:10px; margin-top:4px">— Administrador · ${fmtFecha(f.fecha)}</div>
            </div>`).join('')}
          </div>
        </div>`;
      }).join('')
      : `<div class="card txt-3" style="text-align:center; padding:24px">Aún no has recibido feedback de tu administrador.</div>`}
  </div>`;
};

/* ---- CU-3: tomar capacitaciones (resolver módulos + examen) ---- */
function abrirTomar(capId){ capSeleccionada = capId; moduloAbierto = null; navigate('tomar'); }
function volverCaps(){ capSeleccionada = null; moduloAbierto = null; navigate('tomar'); }
function volverModulos(){ moduloAbierto = null; navigate('tomar'); }
function resolverModulo(moduloId){ moduloAbierto = moduloId; capituloAbierto = null; navigate('tomar'); }
function abrirCapitulo(capituloId){ capituloAbierto = capituloId; navigate('tomar'); }

const CAP_ICONO = t => t === 'pdf' ? '📄' : t === 'video' ? '▶' : t === 'test' ? '📋' : '📝';
const CAP_TIPO_LABEL = t => t === 'pdf' ? 'PDF' : t === 'video' ? 'Video' : t === 'test' ? 'Test' : 'Lectura';

function scrollToTest(){ const el = document.getElementById('test-modulo'); if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

function renderVisorCapitulos(capitulos, numTest){
  if(!capitulos.length){
    return `<div class="card" style="margin-bottom:14px; text-align:center; padding:24px">
      <div style="font-size:32px">📚</div>
      <div class="txt-3" style="font-size:11px; margin-top:6px">Este módulo aún no tiene actividades de contenido. Resuelve la reflexión y el examen abajo.</div>
    </div>`;
  }
  const activo = capitulos.find(c => c.id === capituloAbierto) || capitulos[0];
  const idx = capitulos.findIndex(c => c.id === activo.id);

  let visor;
  if(activo.tipo === 'texto'){
    visor = `<div class="rte-content" style="padding:24px; font-size:13px; line-height:1.9; min-height:360px">${activo.contenido}</div>`;
  } else if(activo.tipo === 'pdf'){
    const src = /^(data:|blob:|https?:)/.test(activo.contenido) ? activo.contenido
      : PDFS_DISPONIBLES.has(activo.contenido) ? `assets/pdfs/${activo.contenido}` : null;
    visor = src
      ? `<embed src="${src}" type="application/pdf" style="width:100%; height:70vh; border:none; display:block">`
      : `<div style="padding:40px; text-align:center; min-height:360px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px">
          <div style="font-size:40px">📄</div>
          <div style="font-weight:600">${activo.contenido}</div>
          <div class="txt-3" style="font-size:11px">Vista previa no disponible para este archivo.</div>
        </div>`;
  } else {
    visor = `<iframe src="${youtubeEmbedUrl(activo.contenido)}" style="width:100%; height:70vh; border:none; display:block" allowfullscreen></iframe>`;
  }

  return `<div class="card" style="padding:0; overflow:hidden; margin-bottom:14px">
    <div style="display:grid; grid-template-columns:240px 1fr">
      <div style="border-right:1px solid var(--border); padding:12px; max-height:70vh; overflow-y:auto">
        <div class="label-upper" style="margin-bottom:8px">Actividades del módulo · ${capitulos.length}</div>
        ${capitulos.map(c => `<div class="clickable" style="display:flex; gap:8px; align-items:flex-start; padding:8px; border-radius:8px; margin-bottom:2px; ${c.id === activo.id ? 'background:var(--accent-light)' : ''}" onclick="abrirCapitulo('${c.id}')">
          <span style="font-size:14px; flex:none">${CAP_ICONO(c.tipo)}</span>
          <span style="flex:1; min-width:0">
            <span style="display:block; font-size:11px; font-weight:${c.id === activo.id ? '700' : '500'}; color:${c.id === activo.id ? 'var(--accent)' : 'var(--text)'}">${c.titulo}</span>
            <span class="txt-3" style="font-size:9px; text-transform:uppercase; letter-spacing:.4px">${CAP_TIPO_LABEL(c.tipo)}</span>
          </span>
        </div>`).join('')}
        ${numTest ? `<div class="clickable" style="display:flex; gap:8px; align-items:flex-start; padding:8px; border-radius:8px; margin-top:6px; border-top:1px dashed var(--border)" onclick="scrollToTest()">
          <span style="font-size:14px; flex:none">📋</span>
          <span style="flex:1; min-width:0">
            <span style="display:block; font-size:11px; font-weight:500">Test del módulo</span>
            <span class="txt-3" style="font-size:9px; text-transform:uppercase; letter-spacing:.4px">Test · ${numTest} pregunta${numTest > 1 ? 's' : ''}</span>
          </span>
        </div>` : ''}
      </div>
      <div style="display:flex; flex-direction:column">
        <div style="display:flex; align-items:center; gap:10px; padding:12px 16px; border-bottom:1px solid var(--border)">
          <span style="font-size:18px">${CAP_ICONO(activo.tipo)}</span>
          <div style="flex:1; min-width:0">
            <div class="txt-3" style="font-size:9px; text-transform:uppercase; letter-spacing:.4px">Actividad ${idx + 1} de ${capitulos.length}</div>
            <div style="font-size:12px; font-weight:700">${activo.titulo}</div>
          </div>
          <span class="chip">${CAP_TIPO_LABEL(activo.tipo)}</span>
        </div>
        ${visor}
      </div>
    </div>
  </div>`;
}

function renderPregunta(p){
  const tipoLabel = { simple: 'Opción múltiple', texto_libre: 'Texto libre', cuantitativa: 'Cuantitativa', cualitativa: 'Cualitativa' }[p.tipo];
  let campo = '';
  if(p.tipo === 'simple'){
    campo = p.opciones.map(op => `<label class="exam-opt"><input type="radio" name="q-${p.id}" value="${op}"> ${op}</label>`).join('');
  } else if(p.tipo === 'cuantitativa'){
    campo = `<input class="input" type="number" id="qval-${p.id}" placeholder="Ingresa un valor numérico">`;
  } else {
    campo = `<textarea class="input" id="qval-${p.id}" rows="3" placeholder="Escribe tu respuesta…"></textarea>`;
  }
  return `<div class="exam-q">
    <div class="q-head"><span class="q-type">${tipoLabel} · ${p.peso}%</span></div>
    <div style="font-size:11px; font-weight:600; margin-bottom:6px">${p.texto}</div>
    ${campo}
  </div>`;
}
function leerRespuestaPregunta(p){
  if(p.tipo === 'simple'){
    const sel = document.querySelector(`input[name="q-${p.id}"]:checked`);
    return sel ? sel.value : '';
  }
  const el = document.getElementById(`qval-${p.id}`);
  return el ? el.value : '';
}
function recolectarPayloadModulo(moduloId){
  const preguntas = getPreguntasDe(moduloId);
  return JSON.stringify({
    reflexion: { aprendido: document.getElementById('reflexion-aprendido').value, aplicacion: document.getElementById('reflexion-aplicacion').value },
    examen: preguntas.map(p => ({ preguntaId: p.id, valor: leerRespuestaPregunta(p) })),
  });
}
function guardarModulo(moduloId){
  guardarBorrador(getParticipanteActual().id, moduloId, recolectarPayloadModulo(moduloId));
  navigate('tomar');
}
function enviarModulo(moduloId){
  enviarRespuesta(getParticipanteActual().id, moduloId, recolectarPayloadModulo(moduloId));
  moduloAbierto = null;
  navigate('tomar');
}

function moduloDetalle(participanteId, cap, m){
  if(m.tipo === 'test') return moduloEvaluacionFinal(participanteId, cap, m);

  const capitulos = getCapitulosDe(m.id);
  const preguntas = getPreguntasDe(m.id);
  const rc = getRespuestaConCalificacion(participanteId, m.id);
  let previa = { reflexion: { aprendido: '', aplicacion: '' } };
  if(rc){ try { previa = JSON.parse(rc.respuesta.contenido); } catch(e) { previa.reflexion.aprendido = rc.respuesta.contenido || ''; } }

  return `
  <div class="drill-head">
    <button class="btn" onclick="volverModulos()">← Módulos</button>
    <div><div class="label-upper">${cap.nombre}</div><div style="font-size:14px; font-weight:700">Módulo ${m.orden} · ${m.nombre}</div></div>
  </div>
  ${renderVisorCapitulos(capitulos, preguntas.length)}
  <div class="card" style="max-width:720px">
    <div class="alert alert-info" style="margin-bottom:16px">ℹ Resuelve las actividades del módulo. Tus respuestas serán evaluadas por la Inteligencia Artificial y revisadas por el Administrador.</div>
    <div class="field"><label>1. Describe brevemente lo aprendido en este módulo</label><textarea class="input" id="reflexion-aprendido">${previa.reflexion.aprendido || ''}</textarea></div>
    <div class="field"><label>2. ¿Cómo aplicarías este contenido en tu emprendimiento?</label><textarea class="input" id="reflexion-aplicacion">${previa.reflexion.aplicacion || ''}</textarea></div>
    ${preguntas.length ? `<div id="test-modulo" style="margin-top:16px">
      <div class="label-upper" style="margin-bottom:2px">📋 Test del módulo</div>
      <div class="txt-3" style="font-size:10px; margin-bottom:8px">Actividad de tipo test para evaluar tus conocimientos de este módulo (${preguntas.length} pregunta${preguntas.length > 1 ? 's' : ''}).</div>
      ${preguntas.map(p => renderPregunta(p)).join('')}
    </div>` : ''}
    <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:8px">
      <button class="btn" onclick="guardarModulo('${m.id}')">Guardar borrador</button>
      <button class="btn btn-primary" onclick="enviarModulo('${m.id}')">Enviar respuestas ✓</button>
    </div>
  </div>`;
}

/* Módulo final de tipo test: un único formulario con los cuestionarios de
   todos los módulos de contenido del curso (ver preguntasEvaluacion). */
function recolectarPayloadEvaluacion(moduloId){
  const preguntas = getPreguntasEvaluacion(moduloId);
  return JSON.stringify({ examen: preguntas.map(p => ({ preguntaId: p.id, valor: leerRespuestaPregunta(p) })) });
}
function guardarEvaluacionFinal(moduloId){ guardarBorrador(getParticipanteActual().id, moduloId, recolectarPayloadEvaluacion(moduloId)); navigate('tomar'); }
function enviarEvaluacionFinal(moduloId){ enviarRespuesta(getParticipanteActual().id, moduloId, recolectarPayloadEvaluacion(moduloId)); moduloAbierto = null; navigate('tomar'); }

function moduloEvaluacionFinal(participanteId, cap, m){
  const preguntas = getPreguntasEvaluacion(m.id);
  const rc = getRespuestaConCalificacion(participanteId, m.id);
  const done = rc && rc.respuesta.estado === 'enviada';
  const modulos = getModulosDe(cap.id).filter(x => x.tipo !== 'test');

  return `
  <div class="drill-head">
    <button class="btn" onclick="volverModulos()">← Módulos</button>
    <div><div class="label-upper">${cap.nombre}</div><div style="font-size:14px; font-weight:700">🎯 ${m.nombre}</div></div>
  </div>
  <div class="card" style="max-width:720px">
    <div class="alert ${done ? 'alert-success' : 'alert-info'}" style="margin-bottom:16px">${done ? '✓' : 'ℹ'} Evaluación final del curso: reúne los cuestionarios de todos los módulos (${preguntas.length} pregunta${preguntas.length > 1 ? 's' : ''}). ${done ? `Ya la enviaste — puntaje ${rc.calificacion.puntaje} pts.` : 'Respóndela para finalizar el curso.'}</div>
    ${preguntas.length ? modulos.map(mod => {
        const ps = getPreguntasDe(mod.id);
        if(!ps.length) return '';
        return `<div class="label-upper" style="margin:16px 0 8px">Módulo ${mod.orden} · ${mod.nombre}</div>${ps.map(p => renderPregunta(p)).join('')}`;
      }).join('') + (getPreguntasDe(m.id).length ? `<div class="label-upper" style="margin:16px 0 8px">🎯 Preguntas de la evaluación final</div>${getPreguntasDe(m.id).map(p => renderPregunta(p)).join('')}` : '')
      : '<div class="txt-3" style="font-size:11px">Los módulos de contenido aún no tienen preguntas configuradas.</div>'}
    <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:8px">
      <button class="btn" onclick="guardarEvaluacionFinal('${m.id}')">Guardar borrador</button>
      <button class="btn btn-primary" onclick="enviarEvaluacionFinal('${m.id}')">Enviar evaluación final ✓</button>
    </div>
  </div>`;
}

SCREENS.tomar = () => {
  const participanteId = getParticipanteActual().id;
  const activas = getInscripcionesActivas(participanteId);

  if(!capSeleccionada){
    if(!activas.length) return '<div class="alert alert-info">ℹ No tienes capacitaciones activas para resolver. Inscríbete desde "Administrar capacitaciones".</div>';
    return `<div class="alert alert-info" style="margin-bottom:14px">ℹ Selecciona una capacitación matriculada para resolver sus módulos.</div>
    <div class="grid-2">${activas.map(insc => {
      const cap = insc.capacitacion;
      const modulos = getModulosDe(cap.id);
      const enviadas = modulos.filter(m => getRespuestaConCalificacion(participanteId, m.id)?.respuesta.estado === 'enviada').length;
      return `<div class="card clickable" title="Abrir ${cap.nombre}" onclick="abrirTomar('${cap.id}')">
        <div class="label-upper">${getEmpresaById(cap.empresaId).nombre}</div>
        <div class="m-name" style="font-size:13px; font-weight:600; margin:2px 0 8px">${cap.nombre}</div>
        <div class="progress"><span style="width:${modulos.length ? Math.round(enviadas / modulos.length * 100) : 0}%; background:${COLORS.accent}"></span></div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px">
          <div class="txt-3" style="font-size:10px">${enviadas}/${modulos.length} módulos completados</div>
          <div class="card-hint">Continuar ${ICON.chevronRight}</div>
        </div>
      </div>`;
    }).join('')}</div>`;
  }

  const cap = getCapacitacion(capSeleccionada);
  if(moduloAbierto) return moduloDetalle(participanteId, cap, getModulo(moduloAbierto));

  const modulos = getModulosDe(cap.id);
  const cards = modulos.map(m => {
    const rc = getRespuestaConCalificacion(participanteId, m.id);
    const done = rc && rc.respuesta.estado === 'enviada';

    if(m.tipo === 'test'){
      const nPreg = getPreguntasEvaluacion(m.id).length;
      const foot = done
        ? `<span class="txt-3" style="font-size:10px">Completado</span><span class="pill pill-alto">${rc.calificacion.puntaje} pts</span>`
        : `<span class="txt-3" style="font-size:10px">Evaluación final</span><button class="btn btn-primary" style="padding:4px 10px" onclick="resolverModulo('${m.id}')">Rendir test →</button>`;
      return `<div class="module-card ${done ? 'done' : 'curso'}" style="border-style:dashed">
        <div class="label-upper">🎯 Evaluación final</div>
        <div class="m-name">${m.nombre}</div>
        <div class="m-desc">Formulario único con ${nPreg} pregunta${nPreg > 1 ? 's' : ''} de todos los módulos</div>
        <div class="progress"><span style="width:${done ? 100 : 0}%; background:${done ? COLORS.alto : 'var(--bg-secondary)'}"></span></div>
        <div class="m-foot">${foot}</div>
      </div>`;
    }

    const nCapitulos = getCapitulosDe(m.id).length;
    const nPreg = getPreguntasDe(m.id).length;
    const foot = done
      ? `<span class="txt-3" style="font-size:10px">Completado</span><span class="pill pill-alto">${rc.calificacion.puntaje} pts</span>`
      : `<span class="txt-3" style="font-size:10px">Por resolver</span><button class="btn btn-primary" style="padding:4px 10px" onclick="resolverModulo('${m.id}')">Resolver →</button>`;
    return `<div class="module-card ${done ? 'done' : 'curso'}">
      <div class="label-upper">Módulo ${m.orden}</div>
      <div class="m-name">${m.nombre}</div>
      <div class="m-desc">${nCapitulos} actividad${nCapitulos === 1 ? '' : 'es'} de contenido${nPreg ? ` · test de ${nPreg} pregunta${nPreg > 1 ? 's' : ''}` : ''}</div>
      <div class="progress"><span style="width:${done ? 100 : 0}%; background:${done ? COLORS.alto : 'var(--bg-secondary)'}"></span></div>
      <div class="m-foot">${foot}</div>
    </div>`;
  }).join('');
  return `
    <div class="drill-head">
      <button class="btn" onclick="volverCaps()">← Capacitaciones</button>
      <div><div class="label-upper">${getEmpresaById(cap.empresaId).nombre}</div><div style="font-size:14px; font-weight:700">${cap.nombre}</div></div>
    </div>
    <div class="grid-3">${cards}</div>`;
};
