// ============================================================
// state.js · Prep POS · Casa Italia
// Estado global reactivo + cache de catálogos + realtime
// ============================================================
import { sb, CTX, subscribeRealtime } from './supabase-client.js';

const listeners = new Map();

export const state = {
  mesas:        [],   // ca_mesas
  pedidos:      [],   // ca_pedidos activos (abierta + suspended)
  pedidoItems:  [],   // ca_pedido_items
  recetas:      [],   // inv_recetas (menú)
  estaciones:   [],   // li_estaciones
  empleados:    [],   // rrhh_empleados (mozos/bartenders)
  floorPlan:    null, // ms_floor_plans
  configLocal:  null, // config_local
  turnoActivo:  null,
  // UI
  mesaSeleccionada: null,
  pedidoActivo:     null
};

export function on(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(fn);
  return () => listeners.get(key)?.delete(fn);
}

export function emit(key, payload) {
  listeners.get(key)?.forEach(fn => {
    try { fn(payload); } catch (e) { console.error(`[emit:${key}]`, e); }
  });
}

export function set(slice, value) {
  state[slice] = value;
  emit(slice, value);
}

// ============================================================
// Bootstrap inicial
// ============================================================
export async function bootstrap() {
  const M = { marca_id: CTX.marca_id };
  const L = { local_id: CTX.local_id };
  const ML = { ...M, ...L };

  const [
    mesasR, recetasR, estacionesR, empleadosR,
    floorR, configR, turnoR, pedidosR
  ] = await Promise.all([
    sb.from('ca_mesas').select('*').match(ML).eq('activa', true).order('numero'),
    sb.from('inv_recetas').select('*').match(M).eq('activo', true).order('categoria_menu').order('orden_menu').order('nombre'),
    sb.from('li_estaciones').select('*').match(ML).eq('activa', true).order('orden_pase'),
    sb.from('rrhh_empleados').select('id, nombre, apellidos, rol').match(ML).eq('estado', 'activo'),
    sb.from('ms_floor_plans').select('*').match(ML).eq('activo', true).maybeSingle(),
    sb.from('config_local').select('*').match(L).maybeSingle(),
    sb.from('ca_turnos').select('*').match(ML).eq('estado', 'abierto').maybeSingle(),
    sb.from('ca_pedidos').select('*').match(ML).in('estado', ['abierta', 'suspended'])
  ]);

  for (const [name, r] of Object.entries({
    mesas: mesasR, recetas: recetasR, estaciones: estacionesR,
    empleados: empleadosR, floor: floorR, config: configR,
    turno: turnoR, pedidos: pedidosR
  })) {
    if (r.error) console.error(`[bootstrap:${name}]`, r.error);
  }

  set('mesas',       mesasR.data || []);
  set('recetas',     recetasR.data || []);
  set('estaciones',  estacionesR.data || []);
  set('empleados',   empleadosR.data || []);
  set('floorPlan',   floorR.data || { ancho_canvas: 800, alto_canvas: 600, layout: {} });
  set('configLocal', configR.data || { igv_pct: 18, servicio_pct_default: 10, moneda_default: 'PEN' });
  set('turnoActivo', turnoR.data || null);
  set('pedidos',     pedidosR.data || []);

  // Cargar items de pedidos activos
  if (state.pedidos.length > 0) {
    const ids = state.pedidos.map(p => p.id);
    const { data, error } = await sb.from('ca_pedido_items').select('*').in('pedido_id', ids);
    if (error) console.error('[items]', error);
    set('pedidoItems', data || []);
  }

  // Realtime
  subscribeMesas();
  subscribePedidos();
  subscribeItems();
}

// ============================================================
// Realtime subs (filtrados por local_id en cliente; RLS en server)
// ============================================================
function subscribeMesas() {
  subscribeRealtime('ca_mesas', payload => {
    const { eventType, new: nuevo, old: viejo } = payload;
    const rec = nuevo || viejo;
    if (rec.local_id !== CTX.local_id) return;

    const lista = [...state.mesas];
    if (eventType === 'INSERT') lista.push(nuevo);
    else if (eventType === 'UPDATE') {
      const i = lista.findIndex(m => m.id === nuevo.id);
      if (i >= 0) lista[i] = nuevo;
    } else if (eventType === 'DELETE') {
      const i = lista.findIndex(m => m.id === viejo.id);
      if (i >= 0) lista.splice(i, 1);
    }
    set('mesas', lista);
  });
}

function subscribePedidos() {
  subscribeRealtime('ca_pedidos', payload => {
    const { eventType, new: nuevo, old: viejo } = payload;
    const rec = nuevo || viejo;
    if (rec.local_id !== CTX.local_id) return;

    const lista = [...state.pedidos];
    if (eventType === 'INSERT') {
      if (['abierta', 'suspended'].includes(nuevo.estado)) lista.push(nuevo);
    } else if (eventType === 'UPDATE') {
      const i = lista.findIndex(p => p.id === nuevo.id);
      if (['cerrada', 'cancelada'].includes(nuevo.estado)) {
        if (i >= 0) lista.splice(i, 1);
      } else {
        if (i >= 0) lista[i] = nuevo; else lista.push(nuevo);
      }
    } else if (eventType === 'DELETE') {
      const i = lista.findIndex(p => p.id === viejo.id);
      if (i >= 0) lista.splice(i, 1);
    }
    set('pedidos', lista);
  });
}

function subscribeItems() {
  subscribeRealtime('ca_pedido_items', payload => {
    const { eventType, new: nuevo, old: viejo } = payload;
    const lista = [...state.pedidoItems];
    if (eventType === 'INSERT') lista.push(nuevo);
    else if (eventType === 'UPDATE') {
      const i = lista.findIndex(it => it.id === nuevo.id);
      if (i >= 0) lista[i] = nuevo;
    } else if (eventType === 'DELETE') {
      const i = lista.findIndex(it => it.id === viejo.id);
      if (i >= 0) lista.splice(i, 1);
    }
    set('pedidoItems', lista);
  });
}

// ============================================================
// Selectors
// ============================================================
export function pedidoDeMesa(mesaId) {
  return state.pedidos.find(p => p.mesa_id === mesaId && p.estado === 'abierta');
}

export function itemsDePedido(pedidoId) {
  return state.pedidoItems
    .filter(it => it.pedido_id === pedidoId && it.estado !== 'cancelado')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

export function estadoMesaUI(mesaId) {
  const p = pedidoDeMesa(mesaId);
  if (!p) return 'libre';
  if (p.estado_servicio === 'cuenta_pedida' || p.estado_servicio === 'pagando') return 'cuenta';
  return 'ocupada';
}

export function recetaPorId(id)   { return state.recetas.find(r => r.id === id); }
export function estacionPorId(id) { return state.estaciones.find(e => e.id === id); }
export function empleadoPorId(id) { return state.empleados.find(e => e.id === id); }

export function mozos() {
  return state.empleados.filter(e => {
    const r = (e.rol || '').toLowerCase();
    return r.includes('mozo') || r.includes('mesero') || r.includes('gerente') || r.includes('anfitri');
  });
}
