/* ===================================================================
   REGICAP — pantallas del Administrador
   Resultados: Consultar (visión general) → se entra al análisis de un
   participante haciendo clic en él. Entregar feedback (CU-7).
   =================================================================== */

MENU = [
  { sec: 'Resultados', items: [
    { id: 'resultados', label: 'Consultar resultados', icon: 'chart' },
  ] },
  { sec: 'Gestión', items: [
    { id: 'feedback', label: 'Entregar feedback', icon: 'feedback' },
  ] },
];
TITLES = { resultados: 'Consultar resultados', feedback: 'Entregar feedback' };

let capDrill = null;
let analisisParticipanteId = null;
let filtroConsultarCap = '';
let fbQuery = '';
let fbParticipanteId = null;
let fbCapacitacionId = null;

/* ---- Consultar (visión general) → Analizar (por participante) ---- */
function seleccionarAnalisis(id){ analisisParticipanteId = id; navigate('resultados'); }
function cerrarAnalisis(){ analisisParticipanteId = null; capDrill = null; navigate('resultados'); }
function abrirDrill(capId){ capDrill = capId; navigate('resultados'); }
function cerrarDrill(){ capDrill = null; navigate('resultados'); }
function setFiltroConsultarCap(capId){ filtroConsultarCap = capId; navigate('resultados'); }
function irAFeedback(participanteId, capacitacionId){
  fbParticipanteId = participanteId; fbCapacitacionId = capacitacionId; fbQuery = '';
  navigate('feedback');
}

SCREENS.resultados = () => {
  if(analisisParticipanteId){
    const persona = construirPersona(analisisParticipanteId);
    if(persona) return renderAnalisisPersona(persona);
    analisisParticipanteId = null;
  }
  return renderConsultar();
};

function renderConsultar(){
  if(capDrill) return renderDrillCapacitacion(capDrill);
  const filas = getTablaGlobalParticipantes();
  const dist = computeDistribucionGlobal();
  const extremos = getCapacitacionExtremos();
  const scored = getCapacitacionesPublicadas().map(c => ({ cap: c, score: computeScoreCapacitacion(c.id) }));
  const conScore = scored.filter(s => s.score !== null);
  const promedio = conScore.length ? Math.round(conScore.reduce((a, s) => a + s.score, 0) / conScore.length) : null;
  const completadas = filas.filter(f => f.inscripcion.estado === 'completada').length;

  return `
  <div class="filters" style="margin-bottom:16px">
    <span class="txt-2" style="font-weight:600">Filtros:</span>
    <span class="filter-chip active">Capacitación ▾</span>
    <span class="filter-chip">Cohorte ▾</span>
    <span class="filter-chip">Período ▾</span>
    <span class="filter-chip">Estado ▾</span>
  </div>
  <div class="grid-4">
    ${metric('Participantes', filas.length, 'inscripciones vigentes', '', '')}
    ${metric('Puntaje promedio', promedio ?? '—', 'entre capacitaciones publicadas', '', '')}
    ${metric('Tasa de completitud', `${filas.length ? Math.round(completadas / filas.length * 100) : 0}%`, '', '', '')}
    ${metric('Rendimiento alto', `${dist.total ? Math.round(dist.alto / dist.total * 100) : 0}%`, '', '', '')}
  </div>
  <div class="grid-3 section-gap">
    <div class="card" style="display:flex; flex-direction:column">
      <div class="label-upper" style="margin-bottom:14px">Puntaje por capacitación</div>
      <div style="flex:1">${scored.map(s => `
        <div class="bar-row clickable" onclick="abrirDrill('${s.cap.id}')">
          <div class="b-label">${s.cap.nombre}</div>
          <div class="bar-track"><span style="width:${s.score || 0}%; background:${s.score ? barColor(s.score) : 'var(--border)'}"></span></div>
          <div class="b-val" style="color:${s.score ? barColor(s.score) : 'var(--text-3)'}">${s.score ?? '—'}</div>
        </div>`).join('')}</div>
      ${extremos.debil ? `<div class="alert alert-warning" style="margin-top:8px">⚠ ${extremos.debil.cap.nombre} presenta el puntaje más bajo. Se recomienda revisión del contenido.</div>` : ''}
    </div>
    <div class="card">
      <div class="label-upper" style="margin-bottom:14px">Distribución</div>
      ${donut(dist.alto, dist.medio, dist.bajo, dist.total, 'total')}
    </div>
    <div class="card">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:2px">
        <div class="label-upper">Participantes</div>
        <select class="input" style="width:auto; padding:5px 8px; font-size:10px" onchange="setFiltroConsultarCap(this.value)">
          <option value="">Todos los cursos</option>
          ${[...new Map(filas.map(f => [f.capacitacion.id, f.capacitacion])).values()].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(c => `<option value="${c.id}" ${filtroConsultarCap === c.id ? 'selected' : ''}>${c.nombre}</option>`).join('')}
        </select>
      </div>
      <div class="txt-3" style="font-size:10px; margin-bottom:8px">Haz clic en un participante para ver su análisis individual</div>
      <table><thead><tr><th>Nombre</th><th>Capacitación</th><th>Pts</th><th>Estado</th><th></th></tr></thead>
      <tbody>${(filtroConsultarCap ? filas.filter(f => f.capacitacion.id === filtroConsultarCap) : filas).map(f => `<tr class="clickable" onclick="seleccionarAnalisis('${f.participante.id}')">
        <td>${f.participante.nombre}</td><td>${f.capacitacion.nombre}</td>
        <td class="${scoreClass(f.nivel)}">${f.score ?? '—'}</td>
        <td>${pillFor(f.nivel)}</td>
        <td class="row-select">Analizar ${ICON.chevronRight}</td></tr>`).join('') || '<tr><td colspan="5" class="txt-3">Sin participantes para este curso.</td></tr>'}</tbody></table>
    </div>
  </div>
  <div class="bottombar" style="margin:16px -20px -20px; border-radius:0">
    <span class="pre">Precondición: sesión iniciada · respuestas procesadas · datos disponibles</span>
    <div class="actions">
      <button class="btn">Exportar reporte</button>
    </div>
  </div>`;
}

function renderDrillCapacitacion(capId){
  const cap = getCapacitacion(capId);
  const modulos = getModulosDe(capId);
  const participantes = getParticipantesDeCapacitacion(capId);
  return `
  <div class="drill-head">
    <button class="btn" onclick="cerrarDrill()">← Volver a resultados</button>
    <div><div class="label-upper">${getEmpresaById(cap.empresaId).nombre}</div><div style="font-size:14px; font-weight:700">${cap.nombre}</div></div>
  </div>
  <div class="grid-2">
    <div class="card">
      <div class="label-upper" style="margin-bottom:14px">Puntaje por módulo</div>
      ${modulos.map(m => {
        const score = computeScoreModulo(m.id);
        return `<div class="bar-row">
          <div class="b-label">M${m.orden} · ${m.nombre}</div>
          <div class="bar-track"><span style="width:${score || 0}%; background:${score ? barColor(score) : 'var(--border)'}"></span></div>
          <div class="b-val" style="color:${score ? barColor(score) : 'var(--text-3)'}">${score ?? '—'}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="card">
      <div class="label-upper" style="margin-bottom:2px">Participantes de esta capacitación</div>
      <div class="txt-3" style="font-size:10px; margin-bottom:8px">Haz clic en un participante para ver su análisis</div>
      <table><thead><tr><th>Nombre</th><th>Pts</th><th>Estado</th><th></th></tr></thead>
      <tbody>${participantes.map(p => `<tr class="clickable" onclick="seleccionarAnalisis('${p.participante.id}')">
        <td>${p.participante.nombre}</td>
        <td class="${scoreClass(p.nivel)}">${p.score ?? '—'}</td>
        <td>${estadoInscripcionPill(p.inscripcion.estado)}</td>
        <td class="row-select">Analizar ${ICON.chevronRight}</td></tr>`).join('')}</tbody></table>
    </div>
  </div>`;
}

/* Analizar: información específica de un participante (calculada en vivo a
   partir de sus respuestas evaluadas por la IA). Se entra haciendo clic en un
   participante desde la pantalla de Consultar. */
function construirPersona(participanteId){
  const rows = getTablaGlobalParticipantes().filter(f => f.participante.id === participanteId);
  if(!rows.length) return null;
  const scored = rows.filter(r => r.score !== null);
  const promedio = scored.length ? Math.round(scored.reduce((a, r) => a + r.score, 0) / scored.length) : null;
  return {
    participante: rows[0].participante, rows, promedio,
    nivel: promedio !== null ? computeNivel(promedio) : null,
    completadas: rows.filter(r => r.inscripcion.estado === 'completada').length,
  };
}

function renderAnalisisPersona(persona){
  const p = persona.participante;
  const criterios = {};
  const capBloques = persona.rows.map(r => {
    const modFilas = getModulosDe(r.capacitacion.id).map(m => {
      const rc = getRespuestaConCalificacion(p.id, m.id);
      const enviada = rc && rc.respuesta.estado === 'enviada';
      const puntaje = enviada ? rc.calificacion.puntaje : null;
      const crit = enviada ? rc.calificacion.criterioMasBajo : '—';
      if(enviada && crit && crit !== '—') criterios[crit] = (criterios[crit] || 0) + 1;
      return { m, enviada, puntaje, crit };
    });
    return { cap: r.capacitacion, modFilas };
  });
  const aReforzar = Object.entries(criterios).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const recom = persona.nivel === 'bajo'
    ? { cls: 'alert-warning', ico: '⚠', txt: `${p.nombre} presenta rendimiento bajo (${persona.promedio} pts). Se recomienda feedback prioritario y refuerzo de contenidos.` }
    : persona.nivel === 'medio'
    ? { cls: 'alert-info', ico: 'ℹ', txt: `${p.nombre} tiene rendimiento medio (${persona.promedio} pts). Un feedback focalizado puede llevarlo a nivel alto.` }
    : persona.nivel === 'alto'
    ? { cls: 'alert-success', ico: '✓', txt: `${p.nombre} mantiene rendimiento alto (${persona.promedio} pts). Buen candidato para reconocimiento.` }
    : { cls: 'alert-info', ico: 'ℹ', txt: `${p.nombre} aún no tiene respuestas evaluadas por la IA. No hay datos suficientes para el análisis.` };

  return `
  <div class="drill-head" style="margin-bottom:12px">
    <button class="btn" onclick="cerrarAnalisis()">← Volver a Consultar</button>
    <div style="flex:1"><div class="label-upper">Analizar · información del participante</div><div style="font-size:14px; font-weight:700">${p.nombre}</div></div>
    ${pillFor(persona.nivel)}
  </div>
  <div class="grid-3">
    ${metric('Promedio global', persona.promedio ?? '—', 'entre sus capacitaciones', '', '')}
    ${metric('Inscripciones', persona.rows.length, 'vigentes', '', '')}
    ${metric('Completadas', persona.completadas, 'finalizadas', '', '')}
  </div>
  <div class="card section-gap">
    <div class="label-upper" style="margin-bottom:14px">Puntaje por capacitación</div>
    ${persona.rows.map(r => `<div class="bar-row">
      <div class="b-label">${r.capacitacion.nombre}</div>
      <div class="bar-track"><span style="width:${r.score || 0}%; background:${r.score ? barColor(r.score) : 'var(--border)'}"></span></div>
      <div class="b-val" style="color:${r.score ? barColor(r.score) : 'var(--text-3)'}">${r.score ?? '—'}</div>
    </div>`).join('')}
  </div>
  <div class="card section-gap">
    <div class="label-upper" style="margin-bottom:10px">Desglose por módulo</div>
    ${capBloques.map(b => `
      <div style="font-size:11px; font-weight:700; margin:12px 0 8px">${b.cap.nombre}</div>
      ${b.modFilas.map(mf => `<div style="margin-bottom:10px">
        <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:3px">
          <span style="font-weight:500">M${mf.m.orden} · ${mf.m.nombre}</span>
          <span style="font-weight:700; color:${mf.puntaje ? barColor(mf.puntaje) : 'var(--text-3)'}">${mf.enviada ? mf.puntaje + ' pts' : 'Pendiente'}</span>
        </div>
        <div class="bar-track"><span style="width:${mf.puntaje || 0}%; background:${mf.puntaje ? barColor(mf.puntaje) : 'var(--border)'}"></span></div>
        ${mf.enviada && mf.crit !== '—' ? `<div class="txt-3" style="font-size:10px; margin-top:3px">A reforzar: ${mf.crit}</div>` : ''}
      </div>`).join('')}
    `).join('')}
  </div>
  ${aReforzar.length ? `<div class="card section-gap">
    <div class="label-upper" style="margin-bottom:10px">Aspectos a reforzar (según IA)</div>
    ${aReforzar.map(([crit, n]) => `<div class="alert alert-warning" style="margin-bottom:6px"><span style="flex:1">⚠ ${crit}</span><span class="txt-3">${n} módulo${n > 1 ? 's' : ''}</span></div>`).join('')}
  </div>` : ''}
  <div class="alert ${recom.cls} section-gap" style="align-items:center">
    <span style="flex:1">${recom.ico} ${recom.txt}</span>
    <button class="btn" style="padding:4px 10px; flex:none" onclick="irAFeedback('${p.id}','${persona.rows[0] ? persona.rows[0].capacitacion.id : ''}')">Dar feedback →</button>
  </div>`;
}

/* ---- CU-7: Entregar feedback ---- */
function setFbQuery(v){ fbQuery = v; navigate('feedback'); }
function seleccionarParticipanteFeedback(id){ fbParticipanteId = id; fbCapacitacionId = null; navigate('feedback'); }
function seleccionarCapacitacionFeedback(id){ fbCapacitacionId = id; navigate('feedback'); }
function descartarFeedback(){ navigate('feedback'); }
function enviarFeedbackYRefrescar(){
  const texto = document.getElementById('fb-texto').value.trim();
  if(!texto || !fbParticipanteId || !fbCapacitacionId) return;
  enviarFeedback(getAdministradorActual().id, fbParticipanteId, fbCapacitacionId, texto);
  navigate('feedback');
}

SCREENS.feedback = () => {
  const participantes = buscarParticipantes(fbQuery);
  const filas = getTablaGlobalParticipantes();
  const resumen = participantes.map(p => {
    const suyas = filas.filter(f => f.participante.id === p.id);
    const peor = suyas.reduce((min, f) => (f.score !== null && (!min || f.score < min.score)) ? f : min, null);
    return { participante: p, suyas, peor };
  }).sort((a, b) => (a.peor?.score ?? 999) - (b.peor?.score ?? 999));

  const participanteId = fbParticipanteId || (resumen[0] && resumen[0].participante.id) || null;
  const filaActiva = resumen.find(r => r.participante.id === participanteId);
  const capacitacionId = fbCapacitacionId || filaActiva?.peor?.capacitacion.id || filaActiva?.suyas[0]?.capacitacion.id || null;
  const bajoRendimiento = filas.filter(f => f.nivel === 'bajo').length;

  return `
  <div style="display:grid; grid-template-columns:1fr 340px; gap:12px">
    <div>
      <div class="card">
        <div class="label-upper" style="margin-bottom:10px">Buscar participante</div>
        <div class="search-wrap" style="margin-bottom:12px">${ICON.search}<input class="input" placeholder="Buscar por nombre…" value="${fbQuery}" oninput="setFbQuery(this.value)"></div>
        <table><thead><tr><th>Participante</th><th>Capacitaciones</th><th>Peor puntaje</th><th></th></tr></thead>
        <tbody>${resumen.map(r => `<tr class="${r.participante.id === participanteId ? 'selected' : ''} clickable" onclick="seleccionarParticipanteFeedback('${r.participante.id}')">
          <td>${r.participante.nombre}</td>
          <td class="txt-3">${r.suyas.length}</td>
          <td class="${scoreClass(r.peor?.nivel)}">${r.peor ? r.peor.score : '—'}</td>
          <td>${r.participante.id === participanteId ? `<span style="color:${COLORS.accent}; font-weight:600">Seleccionado</span>` : ''}</td>
        </tr>`).join('') || '<tr><td colspan="4" class="txt-3">Sin coincidencias.</td></tr>'}</tbody></table>
      </div>
      ${bajoRendimiento ? `<div class="alert alert-warning" style="margin-top:12px">⚠ ${bajoRendimiento} inscripciones con rendimiento bajo requieren atención prioritaria esta semana.</div>` : ''}
    </div>
    <div class="card">
      ${filaActiva ? renderPanelFeedback(filaActiva.participante, capacitacionId) : '<div class="txt-3">Selecciona un participante para ver su detalle.</div>'}
    </div>
  </div>`;
};

function renderPanelFeedback(participante, capacitacionId){
  const inscripciones = getTablaGlobalParticipantes().filter(f => f.participante.id === participante.id);
  const activa = capacitacionId ? getCapacitacion(capacitacionId) : null;
  const historial = getFeedbackDe(participante.id, capacitacionId);

  let respuestaHtml = '<div class="feedback-block">Este participante aún no ha enviado respuestas para esta capacitación.</div>';
  let clasificacionHtml = '';
  if(activa){
    let ultima = null;
    getModulosDe(activa.id).forEach(m => {
      const rc = getRespuestaConCalificacion(participante.id, m.id);
      if(rc && rc.respuesta.estado === 'enviada') ultima = rc;
    });
    if(ultima){
      let textoResp = ultima.respuesta.contenido;
      try { const parsed = JSON.parse(textoResp); textoResp = (parsed.reflexion && (parsed.reflexion.aprendido || parsed.reflexion.aplicacion)) || textoResp; } catch(e) { /* texto plano */ }
      const nivelCap = ultima.calificacion.nivel;
      respuestaHtml = `<div class="feedback-block">"${textoResp}"</div>`;
      clasificacionHtml = `<div style="font-size:11px; color:${COLORS[nivelCap]}; font-weight:600; margin-bottom:14px">Clasificación IA: ${nivelCap[0].toUpperCase() + nivelCap.slice(1)} · ${ultima.calificacion.puntaje} pts${ultima.calificacion.criterioMasBajo !== '—' ? ` · a reforzar: ${ultima.calificacion.criterioMasBajo}` : ''}</div>`;
    }
  }

  return `
  <div class="card-title" style="margin-bottom:12px">Feedback — ${participante.nombre}</div>
  <div class="field"><label>Capacitación</label>
    <select class="input" onchange="seleccionarCapacitacionFeedback(this.value)">
      ${inscripciones.map(f => `<option value="${f.capacitacion.id}" ${f.capacitacion.id === capacitacionId ? 'selected' : ''}>${f.capacitacion.nombre}</option>`).join('')}
    </select>
  </div>
  <div class="label-upper" style="font-size:9px">Respuesta del participante (procesada por IA)</div>
  ${respuestaHtml}
  ${clasificacionHtml}
  <div class="label-upper" style="font-size:9px; margin-bottom:6px">Tu feedback</div>
  <textarea class="input" id="fb-texto" placeholder="Escribe tu retroalimentación…"></textarea>
  <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px">
    <button class="btn" onclick="descartarFeedback()">Descartar</button>
    <button class="btn btn-primary" onclick="enviarFeedbackYRefrescar()">Enviar feedback ✓</button>
  </div>
  <div class="label-upper" style="margin:16px 0 8px">Historial de feedback enviado</div>
  ${historial.length ? historial.map(f => `<div class="fb-item"><div class="txt-2" style="font-size:11px">${f.texto}</div><div class="txt-3" style="font-size:10px; margin-top:4px">${fmtFecha(f.fecha)}</div></div>`).join('')
    : '<div class="txt-3" style="font-size:11px">Aún no se ha enviado feedback para esta capacitación.</div>'}`;
}
