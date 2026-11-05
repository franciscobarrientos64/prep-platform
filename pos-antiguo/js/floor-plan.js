// ============================================================
// floor-plan.js · Vista de mesas con realtime
// Coordenadas: pos_x/pos_y en pixeles dentro de canvas 800x600
// ============================================================
import { state, on, estadoMesaUI, pedidoDeMesa, itemsDePedido, mozos } from './state.js';
import { sb, CTX, audit } from './supabase-client.js';
import { el, $, money, tiempoTranscurrido, toast, modal, confirmar } from './utils.js';
import { abrirPedidoEnMesa } from './pedido.js';

let zonaActiva = 'todas';
let canvasW = 800;
let canvasH = 600;

export function renderFloorPlan(container) {
  container.innerHTML = '';
  container.className = 'fp-screen';

  canvasW = state.floorPlan?.ancho_canvas || 800;
  canvasH = state.floorPlan?.alto_canvas  || 600;

  container.appendChild(buildHeader());

  const main = el('div', { class: 'fp-main' });
  main.appendChild(buildZoneFilter());
  main.appendChild(buildCanvasWrap());
  main.appendChild(buildSidebar());
  container.appendChild(main);

  on('mesas',       () => repintarCanvas());
  on('pedidos',     () => { repintarCanvas(); repintarSidebar(); });
  on('pedidoItems', () => repintarSidebar());
  on('turnoActivo', () => { $('header.fp-header')?.replaceWith(buildHeader()); });

  // Refresh tiempos cada 30s
  setInterval(() => repintarCanvas(), 30000);
}

// ============================================================
// Header
// ============================================================
function buildHeader() {
  const turno = state.turnoActivo;
  return el('header', { class: 'fp-header' },
    el('div', { class: 'col gap-1' },
      el('span', { class: 'eyebrow' }, 'Casa Italia'),
      el('h1', {}, 'Mise en place')
    ),
    el('div', { class: 'row gap-3 center fp-header__right' },
      turno
        ? el('span', { class: 'pill pill--blue' }, 'Turno abierto')
        : el('button', { class: 'btn btn--tertiary btn--sm', onClick: abrirTurno },
            el('span', { class: 'icon' }, 'play_arrow'), 'Abrir turno'),
      el('span', { class: 'pill' },
        el('span', { class: 'icon', style: { fontSize: '0.9rem' } }, 'table_restaurant'),
        ` ${state.mesas.length}`),
      CTX.nombre
        ? el('span', { class: 'pill pill--ink' }, CTX.nombre)
        : null,
      el('button', { class: 'btn btn--ghost btn--sm', onClick: doLogout, title: 'Cerrar sesión' },
        el('span', { class: 'icon' }, 'logout'))
    )
  );
}

async function doLogout() {
  const ok = await confirmar('¿Cerrar sesión?', { ok: 'Va' });
  if (!ok) return;
  const { logout } = await import('./supabase-client.js');
  logout();
  location.reload();
}

// ============================================================
// Zone filter
// ============================================================
function buildZoneFilter() {
  const zonas = ['todas', ...Array.from(new Set(state.mesas.map(m => m.zona).filter(Boolean)))];
  const cont = el('div', { class: 'fp-zones' });
  zonas.forEach(z => {
    const b = el('button', {
      class: 'btn btn--sm' + (z === zonaActiva ? ' btn--primary' : ''),
      onClick: () => { zonaActiva = z; repintarCanvas(); refrescarFiltros(); }
    }, z === 'todas' ? 'Todas' : z[0].toUpperCase() + z.slice(1));
    b.dataset.zona = z;
    cont.appendChild(b);
  });
  return cont;
}

function refrescarFiltros() {
  $('.fp-zones')?.querySelectorAll('button').forEach(b => {
    b.classList.toggle('btn--primary', b.dataset.zona === zonaActiva);
  });
}

// ============================================================
// Canvas
// ============================================================
function buildCanvasWrap() {
  const wrap = el('div', { class: 'fp-canvas-wrap' });
  const canvas = el('div', {
    class: 'fp-canvas',
    id: 'fp-canvas',
    style: {
      '--canvas-w': canvasW + 'px',
      '--canvas-h': canvasH + 'px',
      width:  canvasW + 'px',
      height: canvasH + 'px'
    }
  });
  wrap.appendChild(canvas);
  setTimeout(() => repintarCanvas(), 0);
  return wrap;
}

function repintarCanvas() {
  const canvas = $('#fp-canvas');
  if (!canvas) return;
  canvas.innerHTML = '';

  const mesas = zonaActiva === 'todas'
    ? state.mesas
    : state.mesas.filter(m => m.zona === zonaActiva);

  mesas.forEach(m => canvas.appendChild(buildMesa(m)));
}

function buildMesa(m) {
  const est = estadoMesaUI(m.id);
  const pedido = pedidoDeMesa(m.id);
  const items = pedido ? itemsDePedido(pedido.id) : [];

  const node = el('div', {
    class: `fp-mesa fp-mesa--${est} fp-mesa--${m.forma || 'rectangular'}`,
    style: {
      left:   m.pos_x + 'px',
      top:    m.pos_y + 'px',
      width:  (m.ancho || 60) + 'px',
      height: (m.alto  || 60) + 'px'
    },
    dataset: { id: m.id, zona: m.zona, estado: est },
    onClick: () => clickMesa(m)
  });

  node.appendChild(el('div', { class: 'fp-mesa__label' },
    el('strong', {}, m.numero),
    pedido
      ? el('span', { class: 'fp-mesa__time mono' }, tiempoTranscurrido(pedido.abierta_at))
      : null
  ));

  if (pedido) {
    node.appendChild(el('div', { class: 'fp-mesa__total mono' },
      money(pedido.total || pedido.subtotal || calcSubtotal(items))
    ));
    if (items.length > 0) {
      node.appendChild(el('div', { class: 'fp-mesa__items mono' },
        `${items.length} ítem${items.length === 1 ? '' : 's'}`));
    }
  } else {
    node.appendChild(el('div', { class: 'fp-mesa__cap mono' },
      `${m.capacidad} pax`));
  }

  // Drag&drop: solo mesas con pedido pueden ser arrastradas
  if (pedido) {
    node.draggable = true;
    node.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/pedido', pedido.id);
      e.dataTransfer.setData('text/mesa-origen', m.id);
      node.classList.add('is-dragging');
    });
    node.addEventListener('dragend', () => node.classList.remove('is-dragging'));
  }

  // Drop target: solo mesas libres aceptan
  node.addEventListener('dragover', e => {
    if (!pedido && e.dataTransfer.types.includes('text/pedido')) {
      e.preventDefault();
      node.classList.add('is-drop-target');
    }
  });
  node.addEventListener('dragleave', () => node.classList.remove('is-drop-target'));
  node.addEventListener('drop', async e => {
    e.preventDefault();
    node.classList.remove('is-drop-target');
    const pedidoId = e.dataTransfer.getData('text/pedido');
    const origenId = e.dataTransfer.getData('text/mesa-origen');
    if (!pedidoId || pedido || origenId === m.id) return;
    await moverPedidoAMesa(pedidoId, origenId, m.id);
  });

  return node;
}

function calcSubtotal(items) {
  return items.reduce((s, it) => s + Number(it.precio_total || 0), 0);
}

// ============================================================
// Click en mesa
// ============================================================
function clickMesa(m) {
  const est = estadoMesaUI(m.id);
  if (est === 'libre') {
    abrirNuevoPedido(m);
  } else {
    abrirPedidoEnMesa(m);
  }
}

async function abrirNuevoPedido(m) {
  if (!state.turnoActivo) {
    toast('Atrás — abre un turno primero', 'error');
    return;
  }

  const mozosList = mozos();
  const body = el('div', { class: 'col gap-4' });

  // Pax
  const paxField = el('div', {},
    el('label', { class: 'label' }, 'Comensales'),
    el('div', { class: 'pax-stepper' },
      el('button', { class: 'btn btn--sm btn--ghost', onClick: () => stepPax(-1) },
        el('span', { class: 'icon' }, 'remove')),
      el('input', { class: 'field field--mono', type: 'number', id: 'np-pax', value: '2', min: '1', max: '20', style: { textAlign: 'center' } }),
      el('button', { class: 'btn btn--sm btn--ghost', onClick: () => stepPax(1) },
        el('span', { class: 'icon' }, 'add'))
    )
  );
  body.appendChild(paxField);

  // Mozo
  const sel = document.createElement('select');
  sel.className = 'field';
  sel.id = 'np-mozo';
  sel.innerHTML = '<option value="">— selecciona —</option>' + mozosList
    .map(e => `<option value="${e.id}">${e.nombre} ${e.apellidos || ''} · ${e.rol}</option>`).join('');
  // Preseleccionar al usuario actual si su nombre coincide
  if (CTX.nombre) {
    const match = mozosList.find(e =>
      `${e.nombre} ${e.apellidos || ''}`.toLowerCase().includes(CTX.nombre.toLowerCase().split(' ')[0]));
    if (match) sel.value = match.id;
  }
  body.appendChild(el('div', {},
    el('label', { class: 'label' }, 'Mozo a cargo'),
    sel
  ));

  modal({
    title: `Abrir mesa ${m.numero}`,
    body,
    actions: [
      { label: 'Atrás', className: 'btn--ghost' },
      {
        label: 'Va',
        className: 'btn--primary',
        onClick: async () => {
          const pax = parseInt($('#np-pax').value) || 2;
          const mozo = $('#np-mozo').value || null;
          await crearPedido(m, pax, mozo);
        }
      }
    ]
  });

  function stepPax(d) {
    const i = $('#np-pax');
    i.value = Math.max(1, Math.min(20, (parseInt(i.value) || 1) + d));
  }
}

async function crearPedido(m, pax, mozoId) {
  const { data, error } = await sb.from('ca_pedidos').insert({
    marca_id: CTX.marca_id,
    local_id: CTX.local_id,
    turno_id: state.turnoActivo?.id,
    mesa_id: m.id,
    origen: m.forma === 'barra' ? 'barra' : 'salon',
    estado: 'abierta',
    estado_servicio: 'abierta',
    comensales: pax,
    mozo_id: mozoId
  }).select().single();

  if (error) {
    console.error('[crearPedido]', error);
    toast('Atrás — ' + error.message, 'error');
    return;
  }

  audit('pedido.abrir', 'ca_pedidos', data.id, { mesa: m.numero, pax, mozo_id: mozoId });
  toast(`Va — mesa ${m.numero} abierta`, 'success');
  abrirPedidoEnMesa(m);
}

async function moverPedidoAMesa(pedidoId, origenId, destinoId) {
  const destino = state.mesas.find(x => x.id === destinoId);
  const ok = await confirmar(`¿Mover clientes a ${destino?.numero || 'mesa'}?`, { ok: 'Va' });
  if (!ok) return;

  const { error } = await sb.from('ca_pedidos')
    .update({ mesa_id: destinoId })
    .eq('id', pedidoId)
    .eq('marca_id', CTX.marca_id);

  if (error) { toast('Atrás — ' + error.message, 'error'); return; }
  audit('pedido.mover', 'ca_pedidos', pedidoId, { de: origenId, a: destinoId });
  toast('Servido — clientes movidos', 'success');
}

async function abrirTurno() {
  const fecha = new Date();
  const horaActual = fecha.getHours();
  const nombre = horaActual < 12 ? 'Almuerzo' : horaActual < 18 ? 'Tarde' : 'Cena';

  const { data, error } = await sb.from('ca_turnos').insert({
    marca_id: CTX.marca_id,
    local_id: CTX.local_id,
    fecha: fecha.toISOString().slice(0, 10),
    nombre: `${nombre} ${fecha.toLocaleDateString('es-PE')}`,
    hora_inicio: fecha.toTimeString().slice(0, 8),
    estado: 'abierto'
  }).select().single();

  if (error) {
    console.error('[abrirTurno]', error);
    toast('Atrás — ' + error.message, 'error');
    return;
  }

  const { set } = await import('./state.js');
  set('turnoActivo', data);
  audit('turno.abrir', 'ca_turnos', data.id, { nombre: data.nombre });
  toast('Va — turno abierto', 'success');
}

// ============================================================
// Sidebar — pedidos activos
// ============================================================
function buildSidebar() {
  const side = el('aside', { class: 'fp-sidebar', id: 'fp-sidebar' });
  setTimeout(() => repintarSidebar(), 0);
  return side;
}

function repintarSidebar() {
  const side = $('#fp-sidebar');
  if (!side) return;
  side.innerHTML = '';

  side.appendChild(el('div', { class: 'fp-sidebar__head' },
    el('span', { class: 'eyebrow' }, 'En fuego'),
    el('span', { class: 'pill pill--ink' }, state.pedidos.length)
  ));

  const activos = [...state.pedidos]
    .filter(p => p.estado === 'abierta')
    .sort((a, b) => new Date(a.abierta_at) - new Date(b.abierta_at));

  if (activos.length === 0) {
    side.appendChild(el('p', {
      class: 'mono',
      style: { opacity: 0.5, fontSize: '0.8rem', padding: '16px', textAlign: 'center' }
    }, 'Sin pedidos activos. Toca una mesa para empezar.'));
    return;
  }

  activos.forEach(p => {
    const m = state.mesas.find(x => x.id === p.mesa_id);
    const items = itemsDePedido(p.id);
    const total = p.total || calcSubtotal(items);
    const enFuego = items.filter(it => it.estado === 'fuego').length;

    const card = el('div', {
      class: 'fp-pedido-card',
      onClick: () => m && abrirPedidoEnMesa(m)
    },
      el('div', { class: 'row between gap-2' },
        el('strong', {}, m?.numero || '—'),
        el('span', { class: 'mono', style: { fontSize: '0.75rem' } }, tiempoTranscurrido(p.abierta_at))
      ),
      el('div', { class: 'mono', style: { fontSize: '0.75rem', opacity: 0.7 } },
        `${items.length} ítem${items.length === 1 ? '' : 's'} · ${p.comensales} pax`
      ),
      el('div', { class: 'row between gap-2' },
        el('span', { style: { fontWeight: 700 } }, money(total)),
        enFuego > 0
          ? el('span', { class: 'pill pill--red', style: { fontSize: '0.65rem' } }, `🔥 ${enFuego}`)
          : null
      )
    );
    side.appendChild(card);
  });
}
