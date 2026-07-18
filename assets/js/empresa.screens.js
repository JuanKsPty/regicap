/* ===================================================================
   REGICAP — pantallas de la Empresa
   CU-8 Gestionar capacitaciones (listado + CRUD + publicar/despublicar)
   y CU-9 Gestionar módulos (se llega presionando "Editar" — no es ítem
   de sidebar: orden, contenido y examen por módulo).
   =================================================================== */

MENU = [
  { sec: 'Principal', items: [
    { id: 'registrar', label: 'Gestionar capacitaciones', icon: 'module' },
  ] },
];
TITLES = { registrar: 'Gestionar capacitaciones' };

let empresaEditCapId = null;
let capEnEdicion = null;   // id del capítulo (actividad) que se está editando inline
let moduloExpandido = null; // id del único módulo abierto en el acordeón de "Gestionar módulos"

SCREENS.registrar = () => (empresaEditCapId ? renderGestionModulos(empresaEditCapId) : renderListaCapacitaciones());

/* ---- CU-8: listado + CRUD + publicar/despublicar ---- */
function abrirGestionModulos(capId){ empresaEditCapId = capId; moduloExpandido = null; navigate('registrar'); }
function volverAListaCapacitaciones(){ empresaEditCapId = null; moduloExpandido = null; navigate('registrar'); }
function registrarCapacitacionYRefrescar(){
  const nombre = document.getElementById('reg-nombre').value.trim();
  const duracion = document.getElementById('reg-duracion').value.trim();
  if(!nombre) return;
  crearCapacitacion(getEmpresaActual().id, { nombre, duracion });
  navigate('registrar');
}
function publicarYRefrescar(id){ publicarCapacitacion(id); navigate('registrar'); }
function despublicarYRefrescar(id){ despublicarCapacitacion(id); navigate('registrar'); }
function eliminarCapacitacionYRefrescar(id){
  if(!confirm('¿Eliminar esta capacitación? Se eliminarán también sus módulos y capítulos.')) return;
  eliminarCapacitacion(id);
  navigate('registrar');
}

function renderListaCapacitaciones(){
  const mias = getCapacitacionesDeEmpresa(getEmpresaActual().id);
  return `
  <div class="alert alert-info" style="margin-bottom:16px">ℹ Las capacitaciones publicadas aquí aparecen automáticamente en el catálogo de inscripción del Participante.</div>
  <div class="card" style="max-width:520px; margin-bottom:20px">
    <div class="label-upper" style="margin-bottom:12px">Registrar nueva capacitación</div>
    <div class="field"><label>Nombre de la capacitación</label><input class="input" id="reg-nombre" type="text" placeholder="Ej. Gestión de Inventarios"></div>
    <div class="field"><label>Duración estimada</label><input class="input" id="reg-duracion" type="text" placeholder="Ej. 6 semanas"></div>
    <button class="btn btn-primary" onclick="registrarCapacitacionYRefrescar()">Registrar capacitación →</button>
  </div>

  <div class="label-upper" style="margin-bottom:10px">Mis capacitaciones registradas</div>
  <div class="card">
    <table><thead><tr><th>Nombre</th><th>Duración</th><th>Módulos</th><th>Estado</th><th></th></tr></thead>
    <tbody>${mias.length ? mias.map(c => `<tr>
        <td>${c.nombre}</td>
        <td class="txt-3">${c.duracion}</td>
        <td class="txt-3">${getModulosDe(c.id).length}</td>
        <td>${estadoCapacitacionPill(c.estado)}</td>
        <td><div class="row-actions">
          <button class="btn" onclick="abrirGestionModulos('${c.id}')">Editar</button>
          ${c.estado === 'publicada'
            ? `<button class="btn" onclick="despublicarYRefrescar('${c.id}')">Despublicar</button>`
            : `<button class="btn btn-primary" onclick="publicarYRefrescar('${c.id}')">Publicar</button>`}
          <button class="btn btn-danger" onclick="eliminarCapacitacionYRefrescar('${c.id}')">Eliminar</button>
        </div></td>
      </tr>`).join('') : '<tr><td colspan="5" class="txt-3" style="text-align:center; padding:20px">Aún no has registrado capacitaciones.</td></tr>'}</tbody></table>
  </div>`;
}

/* ---- CU-9: gestión de módulos (orden, contenido, examen) ---- */
function moverModuloYRefrescar(moduloId, dir){ moverModulo(moduloId, dir); navigate('registrar'); }
function eliminarModuloYRefrescar(moduloId){
  if(!confirm('¿Eliminar este módulo y todo su contenido?')) return;
  if(moduloExpandido === moduloId) moduloExpandido = null;
  eliminarModulo(moduloId);
  navigate('registrar');
}
function toggleModuloYRefrescar(moduloId){
  moduloExpandido = moduloExpandido === moduloId ? null : moduloId;
  navigate('registrar');
}
function agregarModuloYRefrescar(capId){
  const input = document.getElementById(`mod-input-${capId}`);
  const val = input.value.trim();
  if(!val){ alert('Ingresa un nombre para el módulo.'); return; }
  const nuevo = crearModulo(capId, val);
  moduloExpandido = nuevo.id;
  navigate('registrar');
}
function esc(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/* Contenido adjuntado que aún no vive en el DOM (los PDF se leen como data
   URL antes de guardar). `key` = moduloId al agregar / capítuloId al editar. */
const pdfAdjunto = {};
function onPdfSeleccionado(inputId, nameId, key){
  const input = document.getElementById(inputId);
  const nameEl = document.getElementById(nameId);
  const file = input.files && input.files[0];
  if(!file){ delete pdfAdjunto[key]; nameEl.textContent = 'Ningún PDF seleccionado'; return; }
  if(file.type !== 'application/pdf'){ alert('Selecciona un archivo PDF.'); input.value = ''; return; }
  if(file.size > 3 * 1024 * 1024){ alert('Para el mockup, adjunta un PDF de menos de 3 MB.'); input.value = ''; nameEl.textContent = 'Ningún PDF seleccionado'; delete pdfAdjunto[key]; return; }
  const reader = new FileReader();
  reader.onload = () => { pdfAdjunto[key] = { name: file.name, dataUrl: reader.result }; nameEl.textContent = `✓ ${file.name} adjuntado`; };
  reader.readAsDataURL(file);
}

/* Editor de texto enriquecido reutilizable (negrita, cursiva, listas, cita,
   enlace) — se usa tanto al agregar como al editar una actividad. */
function rte(bodyId, countId, cmd, val){
  const body = document.getElementById(bodyId);
  if(body) body.focus();
  document.execCommand(cmd, false, val || null);
  rteCount(bodyId, countId);
}
function rteLink(bodyId, countId){
  const url = prompt('URL del enlace:', 'https://');
  if(url) rte(bodyId, countId, 'createLink', url);
}
function rteCount(bodyId, countId){
  const body = document.getElementById(bodyId);
  const counter = document.getElementById(countId);
  if(body && counter) counter.textContent = (body.innerText || '').replace(/\n$/, '').length;
}
function rteBox(bodyId, countId, initial){
  return `<div class="rte">
    <div class="rte-toolbar">
      <button type="button" title="Deshacer" onclick="rte('${bodyId}','${countId}','undo')">↶</button>
      <button type="button" title="Rehacer" onclick="rte('${bodyId}','${countId}','redo')">↷</button>
      <span class="rte-sep"></span>
      <button type="button" title="Negrita" style="font-weight:800" onclick="rte('${bodyId}','${countId}','bold')">B</button>
      <button type="button" title="Cursiva" style="font-style:italic; font-family:Georgia,serif" onclick="rte('${bodyId}','${countId}','italic')">I</button>
      <span class="rte-sep"></span>
      <button type="button" title="Lista con viñetas" onclick="rte('${bodyId}','${countId}','insertUnorderedList')">• ≡</button>
      <button type="button" title="Lista numerada" onclick="rte('${bodyId}','${countId}','insertOrderedList')">1. ≡</button>
      <span class="rte-sep"></span>
      <button type="button" title="Cita" onclick="rte('${bodyId}','${countId}','formatBlock','blockquote')">❝</button>
      <button type="button" title="Insertar enlace" onclick="rteLink('${bodyId}','${countId}')">🔗</button>
      <span class="rte-sep"></span>
      <button type="button" title="Limpiar formato" onclick="rte('${bodyId}','${countId}','removeFormat')">⌫</button>
    </div>
    <div class="rte-body" id="${bodyId}" contenteditable="true" oninput="rteCount('${bodyId}','${countId}')" data-placeholder="Escribe el contenido de la lectura que verá el participante…">${initial || ''}</div>
    <div class="rte-count"><span id="${countId}">0</span> / 3000</div>
  </div>`;
}
function fileboxPdf(inputId, nameId, key, etiqueta){
  return `<label class="filebox" for="${inputId}">
      <span style="font-size:22px">📎</span>
      <span>${etiqueta}</span>
    </label>
    <input type="file" accept="application/pdf" id="${inputId}" style="display:none" onchange="onPdfSeleccionado('${inputId}','${nameId}','${key}')">
    <div class="txt-3" id="${nameId}" style="font-size:10px; margin-top:4px">Ningún PDF seleccionado</div>`;
}

/* Control de contenido (al agregar) que cambia según el tipo de actividad. */
function controlCapitulo(moduloId, tipo){
  if(tipo === 'texto') return rteBox(`cap-text-${moduloId}`, `cap-text-count-${moduloId}`, '');
  if(tipo === 'video') return `<input class="input" id="cap-cont-${moduloId}" type="text" placeholder="Pega la URL de YouTube (https://youtube.com/watch?v=…)">`;
  return fileboxPdf(`cap-file-${moduloId}`, `cap-file-name-${moduloId}`, moduloId, 'Haz clic para <b>adjuntar un PDF</b> <span class="txt-3">(máx. 3 MB)</span>');
}
function actualizarFormatoCapitulo(moduloId){
  const tipo = document.getElementById(`cap-tipo-${moduloId}`).value;
  document.getElementById(`cap-control-${moduloId}`).innerHTML = controlCapitulo(moduloId, tipo);
}

/* ---- Editar / eliminar una actividad existente ---- */
function editarCapituloUI(capId){ capEnEdicion = capId; navigate('registrar'); }
function cancelarEdicionCapitulo(){ capEnEdicion = null; navigate('registrar'); }
function eliminarCapituloYRefrescar(capId){
  if(!confirm('¿Eliminar esta actividad?')) return;
  eliminarCapitulo(capId);
  if(capEnEdicion === capId) capEnEdicion = null;
  navigate('registrar');
}
function controlCapituloEdit(c){
  if(c.tipo === 'texto') return rteBox(`capedit-text-${c.id}`, `capedit-text-count-${c.id}`, c.contenido);
  if(c.tipo === 'video') return `<input class="input" id="capedit-cont-${c.id}" type="text" value="${esc(c.contenido)}" placeholder="URL de YouTube">`;
  const actual = /^data:/.test(c.contenido) ? 'PDF adjunto' : c.contenido;
  return `<div class="txt-3" style="font-size:10px; margin-bottom:4px">Archivo actual: <b>${esc(actual)}</b></div>
    ${fileboxPdf(`capedit-file-${c.id}`, `capedit-file-name-${c.id}`, c.id, 'Reemplazar PDF <span class="txt-3">(opcional, máx. 3 MB)</span>')}`;
}
function renderCapituloEdit(c){
  return `<div style="border:1px solid var(--accent); border-radius:8px; padding:10px; margin:6px 0; background:var(--accent-light)">
    <div class="label-upper" style="font-size:9px; margin-bottom:6px">Editar actividad · ${tipoLabelCap(c.tipo)}</div>
    <input class="input" id="capedit-title-${c.id}" type="text" value="${esc(c.titulo)}" placeholder="Título de la actividad" style="width:100%; margin-bottom:6px">
    ${controlCapituloEdit(c)}
    <div style="display:flex; gap:6px; justify-content:flex-end; margin-top:8px">
      <button class="btn" onclick="cancelarEdicionCapitulo()">Cancelar</button>
      <button class="btn btn-primary" onclick="guardarEdicionCapitulo('${c.id}')">Guardar cambios</button>
    </div>
  </div>`;
}
function guardarEdicionCapitulo(capId){
  const c = getCapitulo(capId);
  if(!c) return;
  const titulo = document.getElementById(`capedit-title-${capId}`).value.trim();
  if(!titulo){ alert('El título no puede quedar vacío.'); return; }
  let contenido = c.contenido;
  if(c.tipo === 'texto'){
    const body = document.getElementById(`capedit-text-${capId}`);
    contenido = (body.innerHTML || '').trim();
    if(!contenido || contenido === '<br>'){ alert('El contenido de la lectura no puede quedar vacío.'); return; }
  } else if(c.tipo === 'video'){
    contenido = document.getElementById(`capedit-cont-${capId}`).value.trim();
    if(!contenido){ alert('La URL del video no puede quedar vacía.'); return; }
  } else if(pdfAdjunto[capId]){
    contenido = pdfAdjunto[capId].dataUrl;
  }
  editarCapitulo(capId, { titulo, contenido });
  delete pdfAdjunto[capId];
  capEnEdicion = null;
  navigate('registrar');
}

function agregarCapituloYRefrescar(moduloId){
  const tipo = document.getElementById(`cap-tipo-${moduloId}`).value;
  let titulo = document.getElementById(`cap-title-${moduloId}`).value.trim();
  let contenido;
  if(tipo === 'pdf'){
    const adj = pdfAdjunto[moduloId];
    if(!adj){ alert('Adjunta un archivo PDF antes de agregar la actividad.'); return; }
    contenido = adj.dataUrl;
    if(!titulo) titulo = adj.name.replace(/\.pdf$/i, '');
  } else if(tipo === 'texto'){
    const body = document.getElementById(`cap-text-${moduloId}`);
    contenido = (body.innerHTML || '').trim();
    if(!contenido || contenido === '<br>'){ alert('Escribe el contenido de la lectura.'); return; }
  } else {
    contenido = document.getElementById(`cap-cont-${moduloId}`).value.trim();
    if(!contenido){ alert('Pega la URL del video de YouTube.'); return; }
  }
  if(!titulo){ alert('Ingresa un título para la actividad.'); return; }
  agregarCapitulo(moduloId, { titulo, tipo, contenido });
  delete pdfAdjunto[moduloId];
  navigate('registrar');
}

function renderGestionModulos(capId){
  const cap = getCapacitacion(capId);
  const modulos = getModulosDe(capId);
  return `
  <div class="drill-head">
    <button class="btn" onclick="volverAListaCapacitaciones()">← Volver a Mis capacitaciones</button>
    <div>${estadoCapacitacionPill(cap.estado)}<div style="font-size:14px; font-weight:700; margin-top:2px">${cap.nombre}</div></div>
  </div>
  <div style="display:flex; gap:6px; margin-bottom:8px; max-width:680px; flex-wrap:wrap">
    <input class="input" id="mod-input-${cap.id}" type="text" placeholder="Nombre del nuevo módulo de contenido" style="flex:1; min-width:220px">
    <button class="btn btn-primary" onclick="agregarModuloYRefrescar('${cap.id}')">+ Módulo</button>
  </div>
  <div class="txt-3" style="font-size:10px; margin-bottom:16px">Cada módulo puede tener actividades (PDF, lectura o video) y un test.</div>
  ${modulos.length ? modulos.map((m, i) => renderModuloCard(m, i === 0, i === modulos.length - 1, m.id === moduloExpandido)).join('')
    : '<div class="card txt-3" style="text-align:center; padding:20px">Esta capacitación aún no tiene módulos.</div>'}`;
}

function tipoLabelCap(tipo){ return tipo === 'pdf' ? 'PDF' : tipo === 'video' ? 'Video' : 'Lectura'; }

const PREG_LABEL = { simple: 'Opción múltiple', texto_libre: 'Texto libre', cuantitativa: 'Cuantitativa', cualitativa: 'Cualitativa' };
const PREG_HINT = {
  simple: 'La IA compara la respuesta del participante con la correcta (coincidencia exacta).',
  texto_libre: 'Respuesta abierta breve; la IA la evalúa según la rúbrica que definas.',
  cuantitativa: 'Respuesta numérica; es correcta si cae dentro de la tolerancia sobre el valor esperado.',
  cualitativa: 'Respuesta argumentativa; la IA evalúa coherencia y profundidad según la rúbrica.',
};

function moduloHeader(m, esPrimero, esUltimo, esTest, expandido){
  return `<div class="modulo-header" onclick="toggleModuloYRefrescar('${m.id}')">
    <div style="display:flex; align-items:center; gap:8px; min-width:0">
      <div class="order-ctrl" onclick="event.stopPropagation()">
        <button ${esPrimero ? 'disabled' : ''} onclick="moverModuloYRefrescar('${m.id}',-1)">▲</button>
        <button ${esUltimo ? 'disabled' : ''} onclick="moverModuloYRefrescar('${m.id}',1)">▼</button>
      </div>
      <span class="m-title">${esTest ? '🎯 ' : `Módulo ${m.orden} · `}${m.nombre}</span>
      <span class="chip" style="flex:none">${esTest ? 'Evaluación final' : 'Contenido'}</span>
    </div>
    <div style="display:flex; align-items:center; gap:10px; flex:none">
      <button class="btn btn-danger" style="padding:4px 9px; font-size:10px" onclick="event.stopPropagation(); eliminarModuloYRefrescar('${m.id}')">Eliminar módulo</button>
      <span class="modulo-chevron ${expandido ? 'open' : ''}">${ICON.chevronRight}</span>
    </div>
  </div>`;
}

function renderPreguntaRow(p){
  return `<div style="display:flex; gap:8px; padding:5px 0; font-size:10px; align-items:center; border-bottom:1px solid var(--border-subtle)" class="txt-2">
    <span class="chip" style="flex:none">${PREG_LABEL[p.tipo] || p.tipo}</span><span style="font-weight:600; flex:1; min-width:0">${p.texto}</span>
    <span class="txt-3" style="flex:none">${p.peso}%</span>
    <button class="icon-btn danger" title="Eliminar pregunta" onclick="eliminarPreguntaYRefrescar('${p.id}')">🗑</button>
  </div>`;
}

function renderModuloCard(m, esPrimero, esUltimo, expandido){
  if(m.tipo === 'test'){
    const propias = getPreguntasDe(m.id);
    const nContenido = getPreguntasEvaluacion(m.id).length - propias.length;
    return `<div class="card modulo-card ${expandido ? 'expanded' : ''}" style="margin-bottom:10px; border:1px dashed var(--border)">
      ${moduloHeader(m, esPrimero, esUltimo, true, expandido)}
      ${expandido ? `<div class="modulo-body">
        <div class="alert alert-info" style="font-size:10px">ℹ Módulo de <b>evaluación final</b>. Reúne automáticamente los <b>${nContenido}</b> cuestionario${nContenido === 1 ? '' : 's'} de los módulos de contenido y puedes sumarle preguntas nuevas exclusivas de esta evaluación.</div>
        <div class="label-upper" style="font-size:9px; margin:12px 0 4px">Preguntas nuevas de la evaluación final</div>
        ${propias.length ? propias.map(renderPreguntaRow).join('') : '<div class="txt-3" style="font-size:10px">Aún no hay preguntas propias — la evaluación usará solo las de los módulos de contenido.</div>'}
        ${renderFormularioPregunta(m.id)}
      </div>` : ''}
    </div>`;
  }

  const capitulos = getCapitulosDe(m.id);
  const preguntas = getPreguntasDe(m.id);
  const icoFor = t => t === 'pdf' ? '📄' : t === 'video' ? '▶' : '📝';
  return `<div class="card modulo-card ${expandido ? 'expanded' : ''}" style="margin-bottom:10px">
    ${moduloHeader(m, esPrimero, esUltimo, false, expandido)}
    ${expandido ? `<div class="modulo-body">

    <div class="label-upper" style="font-size:9px; margin:0 0 4px">Actividades del módulo</div>
    ${capitulos.length ? capitulos.map(c => capEnEdicion === c.id ? renderCapituloEdit(c) : `<div style="display:flex; gap:8px; padding:5px 0; font-size:10px; align-items:center; border-bottom:1px solid var(--border-subtle)" class="txt-2">
      <span>${icoFor(c.tipo)}</span><span style="font-weight:600; flex:1; min-width:0">${c.titulo}</span>
      <span class="chip">${tipoLabelCap(c.tipo)}</span>
      <button class="icon-btn" title="Editar actividad" onclick="editarCapituloUI('${c.id}')">✎</button>
      <button class="icon-btn danger" title="Eliminar actividad" onclick="eliminarCapituloYRefrescar('${c.id}')">🗑</button>
    </div>`).join('') : '<div class="txt-3" style="font-size:10px">Sin actividades aún — agrega la primera abajo.</div>'}
    <div style="border-top:1px dashed var(--border); margin-top:8px; padding-top:8px">
      <div class="label-upper" style="font-size:9px; margin-bottom:6px">Agregar actividad (se mostrará al participante)</div>
      <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center">
        <input class="input" id="cap-title-${m.id}" type="text" placeholder="Título de la actividad" style="flex:2; min-width:120px">
        <select class="input" id="cap-tipo-${m.id}" style="flex:1; min-width:170px" onchange="actualizarFormatoCapitulo('${m.id}')">
          <option value="pdf">📄 PDF (adjuntar archivo)</option>
          <option value="texto">📝 Lectura (texto enriquecido)</option>
          <option value="video">▶ Video (enlace de YouTube)</option>
        </select>
        <button class="btn btn-primary" style="flex:none" onclick="agregarCapituloYRefrescar('${m.id}')">+ Actividad</button>
      </div>
      <div id="cap-control-${m.id}" style="margin-top:8px">${controlCapitulo(m.id, 'pdf')}</div>
    </div>

    <div class="label-upper" style="font-size:9px; margin:14px 0 4px">📋 Test del módulo (opcional — mismos tipos que califica la IA)</div>
    ${preguntas.length ? preguntas.map(renderPreguntaRow).join('') : '<div class="txt-3" style="font-size:10px">Sin test configurado — el módulo solo pide reflexión libre.</div>'}
    ${renderFormularioPregunta(m.id)}
    </div>` : ''}
  </div>`;
}

function campoCond(id, label, extra){
  return `<div class="cond-field"><label>${label}</label><input class="input" id="${id}" ${extra}></div>`;
}
function condicionalPreguntaHtml(moduloId, tipo){
  if(tipo === 'simple') return campoCond(`q-opciones-${moduloId}`, 'Opciones (separadas por coma)', 'type="text" placeholder="Ej. 16 bits, 32 bits, 48 bits, 64 bits"')
    + campoCond(`q-correcta-${moduloId}`, 'Respuesta correcta (texto exacto)', 'type="text" placeholder="Ej. 32 bits"');
  if(tipo === 'cuantitativa') return campoCond(`q-valoresp-${moduloId}`, 'Valor esperado', 'type="number" placeholder="Ej. 8"')
    + campoCond(`q-tolerancia-${moduloId}`, 'Tolerancia (%)', 'type="number" placeholder="Ej. 10"');
  return campoCond(`q-rubrica-${moduloId}`, 'Rúbrica (qué se espera en la respuesta)', 'type="text" placeholder="Ej. menciona porción de red y porción de host"');
}
function renderCondicionalPregunta(moduloId){
  const tipo = document.getElementById(`q-tipo-${moduloId}`).value;
  document.getElementById(`q-cond-${moduloId}`).innerHTML = condicionalPreguntaHtml(moduloId, tipo);
  const hint = document.getElementById(`q-hint-${moduloId}`);
  if(hint) hint.textContent = PREG_HINT[tipo] || '';
}
function renderFormularioPregunta(moduloId){
  return `<div class="q-builder">
    <div class="label-upper" style="font-size:9px; margin-bottom:8px">➕ Agregar pregunta al test</div>
    <input class="input" id="q-texto-${moduloId}" type="text" placeholder="Enunciado de la pregunta" style="width:100%; margin-bottom:8px">
    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end; margin-bottom:8px">
      <div class="cond-field" style="flex:1; min-width:190px"><label>Tipo de pregunta</label>
        <select class="input" id="q-tipo-${moduloId}" onchange="renderCondicionalPregunta('${moduloId}')">
          <option value="simple">🔘 Opción múltiple</option>
          <option value="texto_libre">✍️ Texto libre</option>
          <option value="cuantitativa">🔢 Cuantitativa</option>
          <option value="cualitativa">💬 Cualitativa</option>
        </select>
      </div>
      <div class="cond-field" style="flex:none; width:110px"><label>Peso (%)</label>
        <input class="input" id="q-peso-${moduloId}" type="number" placeholder="Ej. 40">
      </div>
    </div>
    <div class="q-hint" id="q-hint-${moduloId}">${PREG_HINT.simple}</div>
    <div class="cond-fields" id="q-cond-${moduloId}">${condicionalPreguntaHtml(moduloId, 'simple')}</div>
    <button class="btn btn-primary" style="margin-top:10px" onclick="agregarPreguntaYRefrescar('${moduloId}')">+ Pregunta al test</button>
  </div>`;
}
function eliminarPreguntaYRefrescar(preguntaId){
  if(!confirm('¿Eliminar esta pregunta del test?')) return;
  eliminarPregunta(preguntaId);
  navigate('registrar');
}
function agregarPreguntaYRefrescar(moduloId){
  const texto = document.getElementById(`q-texto-${moduloId}`).value.trim();
  const tipo = document.getElementById(`q-tipo-${moduloId}`).value;
  const peso = Number(document.getElementById(`q-peso-${moduloId}`).value) || 0;
  if(!texto || !peso){ alert('Ingresa el enunciado y el peso de la pregunta.'); return; }
  const data = { texto, tipo, peso };
  if(tipo === 'simple'){
    const opciones = document.getElementById(`q-opciones-${moduloId}`).value.split(',').map(s => s.trim()).filter(Boolean);
    const correcta = document.getElementById(`q-correcta-${moduloId}`).value.trim();
    if(opciones.length < 2 || !correcta){ alert('Ingresa al menos 2 opciones y la respuesta correcta.'); return; }
    Object.assign(data, { opciones, respuestaCorrecta: correcta });
  } else if(tipo === 'cuantitativa'){
    data.valorEsperado = Number(document.getElementById(`q-valoresp-${moduloId}`).value) || 0;
    data.tolerancia = Number(document.getElementById(`q-tolerancia-${moduloId}`).value) || 0;
  } else {
    data.rubrica = document.getElementById(`q-rubrica-${moduloId}`).value.trim();
  }
  agregarPregunta(moduloId, data);
  navigate('registrar');
}
