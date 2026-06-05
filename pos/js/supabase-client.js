// ============================================================
// supabase-client.js · Prep POS · Casa Italia
// Cliente + auth por master password + audit_log
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// La anon key se inyecta vía env.js (NO se versiona en git)
// env.js exporta: window.PREP_ENV = { SUPABASE_URL, SUPABASE_ANON_KEY }
const URL = window.PREP_ENV?.SUPABASE_URL || 'https://jmkvphayyhwzootlybde.supabase.co';
const KEY = window.PREP_ENV?.SUPABASE_ANON_KEY;

if (!KEY) {
  console.error('[Prep] Falta SUPABASE_ANON_KEY. Define window.PREP_ENV en env.js');
}

export const sb = createClient(URL, KEY, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 10 } }
});

// ============================================================
// Contexto multi-tenant — Casa Italia
// ============================================================
export const CTX = {
  marca_id: 'm6',
  local_id: 'l11',
  token: null,
  rol: null,
  nombre: null
};

// ============================================================
// Auth
// ============================================================
export async function loginConMaster(password) {
  const { data, error } = await sb.rpc('prep_login_master', {
    p_marca: CTX.marca_id,
    p_local: CTX.local_id,
    p_password: password
  });

  if (error) return { ok: false, error: error.message };
  if (!data?.ok) return { ok: false, error: data?.error || 'Credenciales inválidas' };

  CTX.token = data.token;
  CTX.rol = 'admin';

  localStorage.setItem('prep_sesion', JSON.stringify({
    token: CTX.token,
    rol: CTX.rol,
    ts: Date.now()
  }));

  return { ok: true };
}

export async function restaurarSesion() {
  const raw = localStorage.getItem('prep_sesion');
  if (!raw) return false;
  try {
    const s = JSON.parse(raw);
    if (Date.now() - s.ts > 12 * 60 * 60 * 1000) {
      localStorage.removeItem('prep_sesion');
      return false;
    }
    const { data, error } = await sb.rpc('prep_validar_sesion', { p_token: s.token });
    if (error || !data?.ok) {
      localStorage.removeItem('prep_sesion');
      return false;
    }
    CTX.token = s.token;
    CTX.rol = s.rol || 'admin';
    return true;
  } catch { return false; }
}

export function logout() {
  localStorage.removeItem('prep_sesion');
  CTX.token = null;
  CTX.rol = null;
  CTX.nombre = null;
}

export function setNombre(nombre) {
  CTX.nombre = nombre;
  const raw = localStorage.getItem('prep_sesion');
  if (raw) {
    try {
      const s = JSON.parse(raw);
      s.nombre = nombre;
      localStorage.setItem('prep_sesion', JSON.stringify(s));
    } catch {}
  }
}

// ============================================================
// Audit log — fire & forget
// Schema real: tabla, registro_id, accion, rol_que_actuo, nombre_actor,
//              payload_anterior, payload_nuevo, contexto
// ============================================================
export function audit(accion, tabla, registro_id, payload_nuevo = null, payload_anterior = null) {
  sb.from('audit_log').insert({
    marca_id: CTX.marca_id,
    local_id: CTX.local_id,
    tabla,
    registro_id: registro_id ? String(registro_id) : null,
    accion,
    rol_que_actuo: CTX.rol,
    nombre_actor: CTX.nombre,
    payload_nuevo,
    payload_anterior,
    contexto: 'pos'
  }).then(({ error }) => {
    if (error) console.warn('[audit]', error.message);
  });
}

// ============================================================
// Realtime helper
// ============================================================
export function subscribeRealtime(table, callback, filter = null) {
  const channel = sb.channel(`rt:${table}:${Date.now()}`);
  const conf = { event: '*', schema: 'public', table };
  if (filter) conf.filter = filter;

  channel
    .on('postgres_changes', conf, payload => callback(payload))
    .subscribe(status => {
      if (status === 'SUBSCRIBED') console.log(`[rt] ${table} ✓`);
      if (status === 'CHANNEL_ERROR') console.error(`[rt] ${table} error`);
    });

  return () => sb.removeChannel(channel);
}
