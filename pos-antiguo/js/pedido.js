// ============================================================
// pedido.js · Vista de pedido en una mesa
// MVP: lista de items, agregar del menú, marchar a cocina
// ============================================================
import { state, on, pedidoDeMesa, itemsDePedido, recetaPorId, estacionPorId } from './state.js';
import { sb, CTX, audit } from './supabase-client.js';
import { el, $, $$, money, fmtHora, toast, modal, confirmar, cap } from './utils.js';
import { abrirMenu } from './menu.js';

let mesaActual = null;
let pedidoActualId = null;

export function abrirPedidoEnMesa(mesa) {
  mesaActual = mesa;
  const pedido = pedidoDeMesa(mesa.id);
  if (!pedido) {
    toast('Atrás — la mesa no tiene pedido abierto', 'error');
    return;
  }
  pedidoActualId = pedido.id;

  const screen = document.getElementById('app');
  screen.innerHTML = '';
  screen.className = 'pe-screen';

  screen.appendChild(buildHeader(mesa, pedido));
  screen.appendChild(buildContent(pedido));
  screen.appendChild(buildFooter(pedido));

  // Suscripciones reactivas
  const unsub1 = on('pedidoItems', () => repintar());
  const unsub2 = on('pedidos', () => repintar());

  // Cleanup al volver
  screen._cleanup = () => { unsub1(); unsub2(); };
}

function repintar() {
  if (!pedidoActualId) return;
  const pedido = state.pedidos.find(p => p.id === pedidoActualId);
  if (!pedido) {
    // Pedido cerrado/cancelado → volver al floor
    volverAlFloor();
    return;
  }
  const lista = $('#pe-items');
  if (lista) lista.replaceWith(buildItemsList(pedido));
  const footer = $('.pe-footer');
  if (footer) footer.replaceWith(buildFooter(pedido));
  const headerTotals = $('.pe-header__totals');
  if (headerTotals) headerTotals.replaceWith(buildHeaderTotals(pedido));
}

// ============================================================
// Header
// ============================================================
function buildHeader(mesa, pedido) {
  return el('header', { class: 'pe-header' },
    el('div', { class: 'row gap-3 center' },
      el('button', { class: 'btn btn--ghost btn--sm', onClick: volverAlFloor, title: 'Volver' },
        el('span', { class: 'icon' }, 'arrow_back')),
      el('div', { class: 'col gap-1' },
        el('span', { class: 'eyebrow' }, `${mesa.zona} · ${mesa.capacidad} pax`),
        el('h1', {}, `Mesa ${mesa.numero}`)
      )
    ),
    buildHeaderTotals(pedido)
  );
}

function buildHeaderTotals(pedido) {
  const items = itemsDePedido(pedido.id);
  const subtotal = items.reduce((s, it) => s + Number(it.precio_total || 0), 0);
  return el('div', { class: 'pe-header__totals row gap-3 center' },
    el('div', { class: 'col gap-1', style: { textAlign: 'right' } },
      el('span', { class: 'eyebrow', style: { opacity: 0.6 } }, 'Subtotal'),
      el('strong', { class: 'mono', style: { fontSize: '1.25rem' } }, money(subtotal))
    ),
    el('span', { class: 'pill pill--blue' }, pedido.comensales + ' pax'),
    el('span', { class: 'pill' }, '#' + pedido.ticket_num)
  );
}

// ============================================================
// Content
// ============================================================
function buildContent(pedido) {
  const content = el('div', { class: 'pe-content' });
  content.appendChild(buildItemsList(pedido));
  return content;
}

function buildItemsList(pedido) {
  const items = itemsDePedido(pedido.id);
  const wrap = el('div', { id: 'pe-items', class: 'pe-items' });

  if (items.length === 0) {
    wrap.appendChild(el('div', { class: 'pe-empty' },
      el('span', { class: 'icon icon--xl', style: { opacity: 0.3 } }, 'restaurant_menu'),
      el('h3', { style: { marginTop: '16px' } }, 'Sin items aún'),
      el('p', { class: 'mono', style: { opacity: 0.6, fontSize: '0.85rem' } },
        'Toca "Agregar" para abrir el menú')
    ));
    return wrap;
  }

  // Agrupar por course_step
  const porCourse = {};
  items.forEach(it => {
    const c = it.course_step || 1;
    (porCourse[c] ||= []).push(it);
  });

  Object.keys(porCourse).sort((a, b) => a - b).forEach(c => {
    const courseGroup = el('div', { class: 'pe-course' });
    courseGroup.appendChild(el('div', { class: 'pe-course__head' },
      el('span', { class: 'eyebrow' }, `Tiempo ${c}`),
      el('span', { class: 'pill', style: { fontSize: '0.65rem' } }, `${porCourse[c].length}`)
    ));

    porCourse[c].forEach(it => courseGroup.appendChild(buildItem(it)));
    wrap.appendChild(courseGroup);
  });

  return wrap;
}

function buildItem(it) {
  const receta = recetaPorId(it.receta_id);
  const estacion = estacionPorId(it.station || receta?.estacion_id);
  const emoji = receta?.emoji || '🍽️';

  return el('div', { class: `pe-item pe-item--${it.estado}` },
    el('div', { class: 'pe-item__icon' }, emoji),
    el('div', { class: 'pe-item__body col gap-1' },
      el('div', { class: 'row between gap-2' },
        el('strong', {}, it.nombre),
        el('span', { class: 'mono', style: { fontSize: '0.85rem' } },
          `×${Number(it.qty)} · ${money(it.precio_total)}`)
      ),
      el('div', { class: 'row gap-2 center', style: { flexWrap: 'wrap' } },
        el('span', { class: `pill pill--${pillEstadoColor(it.estado)}`, style: { fontSize: '0.65rem' } },
          microcopyEstado(it.estado)),
        estacion ? el('span', {
          class: 'pill',
          style: { fontSize: '0.65rem', background: estacion.color, color: '#fff' }
        }, `${estacion.emoji} ${estacion.nombre}`) : null,
        it.urgente ? el('span', { class: 'pill pill--red', style: { fontSize: '0.65rem' } }, '⚡ urgente') : null,
        it.seat_position ? el('span', { class: 'pill', style: { fontSize: '0.65rem' } }, `Silla ${it.seat_position}`) : null,
        it.notas ? el('span', { class: 'mono', style: { fontSize: '0.75rem', opacity: 0.7 } }, '· ' + it.notas) : null
      )
    ),
    el('div', { class: 'pe-item__actions col gap-1' },
      it.estado === 'oido'
        ? el('button', {
            class: 'btn btn--sm btn--ghost', title: 'Quitar',
            onClick: () => eliminarItem(it)
          }, el('span', { class: 'icon' }, 'close'))
        : null
    )
  );
}

function microcopyEstado(estado) {
  return ({
    oido: 'Oído',
    va: 'Va',
    fuego: '🔥 En fuego',
    servido: '✓ Servido',
    cancelado: 'Cancelado'
  })[estado] || estado;
}

function pillEstadoColor(estado) {
  return ({ oido: '', va: 'yellow', fuego: 'red', servido: 'blue', cancelado: 'ink' })[estado] || '';
}

// ============================================================
// Footer (acciones)
// ============================================================
function buildFooter(pedido) {
  const items = itemsDePedido(pedido.id);
  const sinMarchar = items.filter(it => it.estado === 'oido');
  const hayItems = items.length > 0;

  return el('div', { class: 'pe-footer' },
    el('button', { class: 'btn btn--ghost', onClick: () => mostrarOpcionesPedido(pedido) },
      el('span', { class: 'icon' }, 'more_horiz')),

    el('button', {
      class: 'btn btn--primary btn--lg grow',
      onClick: () => abrirMenu(pedido, () => repintar())
    },
      el('span', { class: 'icon' }, 'add'),
      'Agregar al pedido'),

    sinMarchar.length > 0
      ? el('button', {
          class: 'btn btn--secondary btn--lg',
          onClick: () => marcharACocina(sinMarchar)
        },
          el('span', { class: 'icon' }, 'local_fire_department'),
          `En fuego (${sinMarchar.length})`)
      : null,

    !hayItems
      ? null
      : el('button', {
          class: 'btn btn--tertiary btn--lg',
          onClick: () => iniciarCobro(pedido),
          title: 'Cobrar (próxima iteración)'
        },
          el('span', { class: 'icon' }, 'point_of_sale'),
          'Cobrar')
  );
}

// ============================================================
// Acciones
// ============================================================
async function marcharACocina(items) {
  const ids = items.map(it => it.id);
  const { error } = await sb.from('ca_pedido_items')
    .update({ estado: 'va', enviado_cocina_at: new Date().toISOString() })
    .in('id', ids);

  if (error) { toast('Atrás — ' + error.message, 'error'); return; }
  audit('items.marchar', 'ca_pedido_items', null, { ids, count: ids.length });
  toast(`En fuego — ${ids.length} ítem${ids.length === 1 ? '' : 's'} a cocina`, 'success');

  // Actualizar estado_servicio del pedido
  await sb.from('ca_pedidos')
    .update({ estado_servicio: 'comiendo' })
    .eq('id', pedidoActualId)
    .eq('estado_servicio', 'abierta');
}

async function eliminarItem(it) {
  const ok = await confirmar(`¿Quitar "${it.nombre}" del pedido?`, { ok: 'Va' });
  if (!ok) return;
  const { error } = await sb.from('ca_pedido_items').delete().eq('id', it.id);
  if (error) { toast('Atrás — ' + error.message, 'error'); return; }
  audit('item.eliminar', 'ca_pedido_items', it.id, null, { nombre: it.nombre, qty: it.qty });
  // Recalcular subtotal del pedido
  await recalcularTotales(pedidoActualId);
  toast('Servido', 'success');
}

export async function recalcularTotales(pedidoId) {
  // Llamada simple desde cliente. En el futuro: trigger en DB.
  const { data: items } = await sb.from('ca_pedido_items')
    .select('precio_total')
    .eq('pedido_id', pedidoId)
    .neq('estado', 'cancelado');

  const subtotal = (items || []).reduce((s, it) => s + Number(it.precio_total || 0), 0);
  const cfg = state.configLocal || {};
  const servicio_pct = Number(cfg.servicio_pct_default || 10);
  const igv_pct = Number(cfg.igv_pct || 18);

  const servicio_monto = subtotal * servicio_pct / 100;
  const base_igv = subtotal + servicio_monto;
  const igv = base_igv * igv_pct / (100 + igv_pct); // IGV incluido
  const total = subtotal + servicio_monto;

  await sb.from('ca_pedidos').update({
    subtotal: subtotal.toFixed(2),
    servicio_pct: servicio_pct,
    servicio_monto: servicio_monto.toFixed(2),
    igv: igv.toFixed(2),
    total: total.toFixed(2)
  }).eq('id', pedidoId);
}

function iniciarCobro(pedido) {
  toast('Próxima iteración — módulo de cobro completo', 'info');
}

function mostrarOpcionesPedido(pedido) {
  modal({
    title: `Opciones · Mesa ${mesaActual.numero}`,
    body: el('div', { class: 'col gap-2' },
      el('button', {
        class: 'btn btn--block btn--ghost',
        onClick: async () => { await suspenderPedido(pedido); }
      },
        el('span', { class: 'icon' }, 'pause'), 'Suspender pedido'),
      el('button', {
        class: 'btn btn--block btn--ghost',
        onClick: async () => { await cancelarPedido(pedido); }
      },
        el('span', { class: 'icon' }, 'cancel'), 'Cancelar pedido (descartar)')
    ),
    actions: [{ label: 'Atrás', className: 'btn--ghost' }]
  });
}

async function suspenderPedido(pedido) {
  const items = itemsDePedido(pedido.id);
  if (items.some(it => it.estado === 'va' || it.estado === 'fuego')) {
    toast('Atrás — ya hay ítems en cocina', 'error');
    return;
  }
  const { error } = await sb.from('ca_pedidos')
    .update({ estado: 'suspended', suspended_at: new Date().toISOString() })
    .eq('id', pedido.id);
  if (error) { toast('Atrás — ' + error.message, 'error'); return; }
  audit('pedido.suspender', 'ca_pedidos', pedido.id);
  toast('Servido — pedido suspendido', 'success');
  volverAlFloor();
}

async function cancelarPedido(pedido) {
  const ok = await confirmar('¿Cancelar el pedido completo? Esta acción no se deshace.', { ok: 'Sí, cancelar' });
  if (!ok) return;
  const { error } = await sb.from('ca_pedidos')
    .update({ estado: 'cancelada' })
    .eq('id', pedido.id);
  if (error) { toast('Atrás — ' + error.message, 'error'); return; }
  audit('pedido.cancelar', 'ca_pedidos', pedido.id);
  toast('Servido — pedido cancelado', 'success');
  volverAlFloor();
}

function volverAlFloor() {
  mesaActual = null;
  pedidoActualId = null;
  // Trigger re-render del floor plan
  import('./floor-plan.js').then(m => {
    const screen = document.getElementById('app');
    screen._cleanup?.();
    m.renderFloorPlan(screen);
  });
}
