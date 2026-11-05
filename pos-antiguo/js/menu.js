// ============================================================
// menu.js · Menú de Casa Italia (Cocina / Bar)
// Selección de items + cantidad + notas + course
// ============================================================
import { state, on } from './state.js';
import { sb, CTX, audit } from './supabase-client.js';
import { el, $, $$, money, toast } from './utils.js';
import { recalcularTotales } from './pedido.js';

let pedidoActual = null;
let onAfter = null;
let categoriaActiva = null;
let moduloActivo = 'cocina';
let courseActivo = 1;

export function abrirMenu(pedido, callback) {
  pedidoActual = pedido;
  onAfter = callback;
  moduloActivo = 'cocina';
  courseActivo = 1;

  const screen = document.getElementById('app');
  const prev = screen.innerHTML;
  screen._prev = prev;

  screen.innerHTML = '';
  screen.className = 'mn-screen';

  screen.appendChild(buildHeader());
  screen.appendChild(buildModuloTabs());
  screen.appendChild(buildContent());
  screen.appendChild(buildFooter());

  // Default: primera categoría del módulo activo
  setTimeout(() => {
    const firstCat = categoriasDe(moduloActivo)[0];
    if (firstCat) seleccionarCategoria(firstCat);
  }, 0);
}

function cerrarMenu() {
  const screen = document.getElementById('app');
  if (screen._prev !== undefined) {
    // Recargar la vista del pedido
    import('./pedido.js').then(m => {
      const mesa = state.mesas.find(x => x.id === pedidoActual.mesa_id);
      if (mesa) m.abrirPedidoEnMesa(mesa);
    });
  }
}

// ============================================================
// Header
// ============================================================
function buildHeader() {
  const mesa = state.mesas.find(x => x.id === pedidoActual.mesa_id);
  return el('header', { class: 'mn-header' },
    el('button', { class: 'btn btn--ghost btn--sm', onClick: cerrarMenu },
      el('span', { class: 'icon' }, 'arrow_back'), 'Atrás'),
    el('div', { class: 'col gap-1' },
      el('span', { class: 'eyebrow' }, `Mesa ${mesa?.numero || ''} · pedido`),
      el('h1', {}, 'Menú')
    ),
    el('div', { class: 'mn-course-picker row gap-2 center' },
      el('span', { class: 'eyebrow' }, 'Tiempo'),
      ...[1, 2, 3, 4].map(n => el('button', {
        class: 'btn btn--sm' + (courseActivo === n ? ' btn--primary' : ' btn--ghost'),
        onClick: () => { courseActivo = n; $$('.mn-course-picker .btn').forEach((b, i) => {
          b.classList.toggle('btn--primary', i === n - 1);
          b.classList.toggle('btn--ghost', i !== n - 1);
        }); }
      }, String(n)))
    )
  );
}

// ============================================================
// Tabs Cocina / Bar
// ============================================================
function buildModuloTabs() {
  const tabs = el('div', { class: 'mn-modulo-tabs' });
  [
    { id: 'cocina', icon: 'restaurant', label: 'Cocina' },
    { id: 'bar',    icon: 'local_bar',  label: 'Bar' }
  ].forEach(m => {
    const b = el('button', {
      class: 'mn-modulo-tab' + (m.id === moduloActivo ? ' is-active' : ''),
      onClick: () => seleccionarModulo(m.id)
    },
      el('span', { class: 'icon icon--lg' }, m.icon),
      el('span', { class: 'mono' }, m.label)
    );
    b.dataset.modulo = m.id;
    tabs.appendChild(b);
  });
  return tabs;
}

function seleccionarModulo(id) {
  moduloActivo = id;
  $$('.mn-modulo-tab').forEach(t => t.classList.toggle('is-active', t.dataset.modulo === id));
  const firstCat = categoriasDe(id)[0];
  if (firstCat) seleccionarCategoria(firstCat);
  repintarContent();
}

// ============================================================
// Content (categorías + items)
// ============================================================
function buildContent() {
  return el('div', { class: 'mn-content', id: 'mn-content' },
    el('aside', { class: 'mn-categorias', id: 'mn-categorias' }),
    el('section', { class: 'mn-items', id: 'mn-items' })
  );
}

function categoriasDe(modulo) {
  const cats = new Set();
  state.recetas
    .filter(r => r.modulo === modulo)
    .forEach(r => cats.add(r.categoria_menu || 'Sin categoría'));
  return Array.from(cats).sort();
}

function repintarContent() {
  const catWrap = $('#mn-categorias');
  if (!catWrap) return;
  catWrap.innerHTML = '';

  categoriasDe(moduloActivo).forEach(cat => {
    const count = state.recetas.filter(r => r.modulo === moduloActivo && r.categoria_menu === cat).length;
    const b = el('button', {
      class: 'mn-cat' + (cat === categoriaActiva ? ' is-active' : ''),
      onClick: () => seleccionarCategoria(cat)
    },
      el('span', {}, cat),
      el('span', { class: 'mn-cat__count mono' }, count)
    );
    b.dataset.cat = cat;
    catWrap.appendChild(b);
  });

  repintarItems();
}

function seleccionarCategoria(cat) {
  categoriaActiva = cat;
  $$('.mn-cat').forEach(b => b.classList.toggle('is-active', b.dataset.cat === cat));
  repintarItems();
}

function repintarItems() {
  const wrap = $('#mn-items');
  if (!wrap) return;
  wrap.innerHTML = '';

  const items = state.recetas
    .filter(r => r.modulo === moduloActivo && r.categoria_menu === categoriaActiva);

  if (items.length === 0) {
    wrap.appendChild(el('p', { class: 'mono', style: { opacity: 0.5, padding: '24px' } },
      'Sin items en esta categoría'));
    return;
  }

  items.forEach(r => wrap.appendChild(buildItemCard(r)));
}

function buildItemCard(r) {
  const alergenos = (r.alergenos || []).filter(Boolean);
  return el('div', {
    class: 'mn-item',
    onClick: () => agregarAlPedido(r)
  },
    el('div', { class: 'mn-item__head' },
      el('span', { class: 'mn-item__emoji' }, r.emoji || '🍽️'),
      el('div', { class: 'col gap-1', style: { flex: 1, minWidth: 0 } },
        el('strong', { class: 'mn-item__name' }, r.nombre),
        r.descripcion
          ? el('span', { class: 'mn-item__desc mono' }, r.descripcion)
          : null
      )
    ),
    el('div', { class: 'mn-item__foot' },
      el('strong', { class: 'mono mn-item__price' }, money(r.precio_venta)),
      alergenos.length > 0
        ? el('span', { class: 'mn-item__aler mono' }, '⚠ ' + alergenos.join(', '))
        : null
    )
  );
}

// ============================================================
// Agregar al pedido
// ============================================================
async function agregarAlPedido(r) {
  // Animación visual de feedback
  toast(`Oído — ${r.nombre}`, 'success', 1500);

  const { data, error } = await sb.from('ca_pedido_items').insert({
    pedido_id: pedidoActual.id,
    receta_id: r.id,
    nombre: r.nombre,
    qty: 1,
    precio_unit: r.precio_venta,
    precio_total: r.precio_venta,
    estado: 'oido',
    station: r.estacion_id,
    course_step: courseActivo,
    modificadores: [],
    urgente: false
  }).select().single();

  if (error) {
    console.error('[agregarAlPedido]', error);
    toast('Atrás — ' + error.message, 'error');
    return;
  }

  audit('item.agregar', 'ca_pedido_items', data.id,
    { nombre: r.nombre, precio: r.precio_venta, course: courseActivo });

  // Recalcular totales
  await recalcularTotales(pedidoActual.id);

  // Mark+state_servicio si era abierta → ordenando
  await sb.from('ca_pedidos')
    .update({ estado_servicio: 'ordenando' })
    .eq('id', pedidoActual.id)
    .eq('estado_servicio', 'abierta');
}

// ============================================================
// Footer
// ============================================================
function buildFooter() {
  return el('div', { class: 'mn-footer' },
    el('button', { class: 'btn btn--primary btn--lg btn--block', onClick: cerrarMenu },
      el('span', { class: 'icon' }, 'check'),
      'Va — terminar')
  );
}
