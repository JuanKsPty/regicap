/* ===================================================================
   REGICAP — ui.js
   Helpers de render compartidos por admin.html / participante.html /
   empresa.html, más el mecanismo de shell (sidebar + topbar) y el
   navigate() interno que cada <rol>.screens.js alimenta vía SCREENS.
   =================================================================== */

const COLORS = { alto: '#1D9E75', medio: '#EF9F27', bajo: '#E24B4A', info: '#378ADD', accent: '#185FA5' };

const ICON = {
  dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  proc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="4"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>',
  module: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
  feedback: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  bell: '<svg class="bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
};

/* ============ HELPERS DE FORMATO ============ */
function barColor(score){ return score >= 80 ? COLORS.alto : score < 60 ? COLORS.bajo : COLORS.accent; }
function initials(nombre){ return nombre.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join(''); }
function fmtFecha(iso){
  if(!iso) return '—';
  const [y, m, d] = iso.split('-');
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d} ${meses[+m - 1]}`;
}
function pillFor(nivel){
  if(!nivel) return '<span class="pill pill-pend">Sin datos</span>';
  const map = { alto: ['pill-alto', 'Alto'], medio: ['pill-medio', 'Medio'], bajo: ['pill-bajo', 'Bajo'] };
  const [cls, txt] = map[nivel];
  return `<span class="pill ${cls}">${txt}</span>`;
}
function scoreClass(nivel){ return nivel ? 'score-' + nivel : 'txt-3'; }
function estadoInscripcionPill(estado){
  const map = { pendiente: ['pill-pend', 'Pendiente'], en_curso: ['pill-curso', 'En curso'], completada: ['pill-alto', 'Completada'], cancelada: ['pill-cancelada', 'Cancelada'] };
  const [cls, txt] = map[estado];
  return `<span class="pill ${cls}">${txt}</span>`;
}
function estadoCapacitacionPill(estado){
  const map = { borrador: ['pill-borrador', 'Borrador'], publicada: ['pill-publicada', 'Publicada'], despublicada: ['pill-despublicada', 'Despublicada'] };
  const [cls, txt] = map[estado];
  return `<span class="pill ${cls}">${txt}</span>`;
}

/* ============ COMPONENTES DE RENDER ============ */
function metric(label, value, sub, trend, trendClass){
  return `<div class="card metric">
    <div class="m-label">${label}</div>
    <div class="big-num">${value}</div>
    ${sub ? `<div class="m-sub">${sub}</div>` : ''}
    ${trend ? `<div class="trend ${trendClass}">${trend}</div>` : ''}
  </div>`;
}
function donut(alto, medio, bajo, centerLabel, centerSub){
  const total = Math.max(1, alto + medio + bajo);
  const C = 2 * Math.PI * 42;
  let offset = 0;
  const seg = (val, color) => {
    const len = C * (val / total);
    const s = `<circle cx="60" cy="60" r="42" fill="none" stroke="${color}" stroke-width="16"
      stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 60 60)"/>`;
    offset += len; return s;
  };
  return `<div class="donut-wrap">
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="42" fill="none" stroke="#EFF1F7" stroke-width="16"/>
      ${seg(alto, COLORS.alto)}${seg(medio, COLORS.medio)}${seg(bajo, COLORS.bajo)}
      <text x="60" y="56" text-anchor="middle" font-size="20" font-weight="700" fill="#1A2140">${centerLabel}</text>
      <text x="60" y="72" text-anchor="middle" font-size="9" fill="#9AA0B8">${centerSub}</text>
    </svg>
    <div class="donut-legend">
      <div class="legend-row"><span class="dot" style="background:${COLORS.alto}"></span>Alto <b>${Math.round(alto / total * 100)}%</b></div>
      <div class="legend-row"><span class="dot" style="background:${COLORS.medio}"></span>Medio <b>${Math.round(medio / total * 100)}%</b></div>
      <div class="legend-row"><span class="dot" style="background:${COLORS.bajo}"></span>Bajo <b>${Math.round(bajo / total * 100)}%</b></div>
    </div>
  </div>`;
}
function tabsHtml(items, activeId, onClickFn){
  return `<div class="tabs">${items.map(t => `<button type="button" class="tab-btn ${t.id === activeId ? 'active' : ''}" onclick="${onClickFn}('${t.id}')">${t.label}</button>`).join('')}</div>`;
}

/* ============ SHELL: sidebar + topbar + navegación interna ============
   Cada <rol>.screens.js define SCREENS/MENU/TITLES antes de llamar a bootApp(). */
let SCREENS = {};
let MENU = [];
let TITLES = {};

function buildNav(){
  document.getElementById('nav').innerHTML = MENU.map(group => `
    <div class="nav-section">${group.sec}</div>
    ${group.items.map(it => `
      <div class="nav-item" data-screen="${it.id}" onclick="navigate('${it.id}')">
        ${ICON[it.icon]}<span>${it.label}</span>
      </div>`).join('')}
  `).join('');
}

function navigate(screenId, params){
  const content = document.getElementById('content');
  content.innerHTML = SCREENS[screenId] ? SCREENS[screenId](params) : '<div class="card">Pantalla no disponible</div>';
  document.getElementById('topTitle').textContent = TITLES[screenId] || '';
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.screen === screenId));
  document.getElementById('topRight').innerHTML = `<span class="chip">Cohorte 2025-A</span>${ICON.bell}`;
  content.scrollTop = 0;
}

function bootApp(role, entidadActual, homeScreen){
  const identity = SESSION_IDENTITIES[role];
  document.documentElement.style.setProperty('--role', identity.color);
  document.getElementById('userAvatar').textContent = initials(entidadActual.nombre);
  document.getElementById('userAvatar').style.background = identity.color;
  document.getElementById('userName').textContent = entidadActual.nombre;
  document.getElementById('userRole').textContent = identity.role;
  buildNav();
  navigate(homeScreen);
}
