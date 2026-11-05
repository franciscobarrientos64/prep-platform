// admin-usuarios: alta y baja de usuarios de Prep con su cuenta de acceso.
// POST {accion:'crear', email, nombre, rol_sistema, marca_id, local_id, rol_id, empleado_id, permisos, activo}
//   → crea la cuenta (auth) con clave temporal, la fila en prep_usuarios y devuelve la clave
//     con el mismo formato que admin-enviar-acceso (para el PDF de acceso).
// POST {accion:'quitar', id} → borra la fila de prep_usuarios y sus marcas extra. La cuenta de
//   acceso solo se borra si la creó Prep (user_metadata.prep=true): el proyecto Supabase es
//   compartido con otras apps y no se tocan cuentas ajenas.
// Puede usarlo el super admin, o admin_marca/gerente solo dentro de su marca y sin crear super admins.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };
const URLS: Record<string, [string, string]> = { m6: ["Casa Italia", "https://casa-italia.prep.rest"], m7: ["Symposium", "https://symposium.prep.rest"], m8: ["La Cuadra de Salvador", "https://lcds.prep.rest"] };
const ROLES = ["superadmin", "admin_marca", "gerente", "operativo"];
async function q(path: string) { const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: H }); return r.ok ? await r.json() : []; }
function tempPass() { const a = "abcdefghjkmnpqrstuvwxyz23456789"; const r = crypto.getRandomValues(new Uint8Array(6)); return "Prep" + Array.from(r).map((b) => a[b % a.length]).join(""); }
async function buscarAuth(email: string) {
  // la API admin no filtra por email: se recorre por páginas
  for (let page = 1; page <= 20; page++) {
    const r = await fetch(`${SB_URL}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: H });
    if (!r.ok) return null;
    const j = await r.json(); const us = j.users || [];
    const u = us.find((x: any) => (x.email || "").toLowerCase() === email);
    if (u) return u;
    if (us.length < 200) return null;
  }
  return null;
}
Deno.serve(async (req: Request) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST,OPTIONS" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const J = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  const ur = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SRK, Authorization: req.headers.get("Authorization") || "" } });
  if (!ur.ok) return J({ ok: false, error: "No autenticado." }, 401);
  const cEmail = ((await ur.json()).email || "").toLowerCase();
  const cu = (await q(`prep_usuarios?email=eq.${encodeURIComponent(cEmail)}&select=rol_sistema,marca_id,activo`))[0];
  if (!cu || cu.activo === false || !["superadmin", "admin_marca", "gerente"].includes(cu.rol_sistema)) return J({ ok: false, error: "Sin permiso." }, 403);
  const esSuper = cu.rol_sistema === "superadmin";
  const misMarcas = esSuper ? [] : [cu.marca_id, ...(await q(`prep_usuario_marcas?email=eq.${encodeURIComponent(cEmail)}&select=marca_id`)).map((x: any) => x.marca_id)];
  let b: any = {}; try { b = await req.json(); } catch (_) {}

  if (b.accion === "crear") {
    const email = String(b.email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return J({ ok: false, error: "El correo no es válido." }, 400);
    if (!String(b.nombre || "").trim()) return J({ ok: false, error: "Falta el nombre." }, 400);
    const rol = ROLES.includes(b.rol_sistema) ? b.rol_sistema : "operativo";
    if (!esSuper && (rol === "superadmin" || !misMarcas.includes(b.marca_id))) return J({ ok: false, error: "Solo puedes crear usuarios de tu restaurante." }, 403);
    if ((await q(`prep_usuarios?email=eq.${encodeURIComponent(email)}&select=id`)).length) return J({ ok: false, error: "Ese correo ya tiene usuario en Prep." }, 409);
    const pass = tempPass();
    let au = await buscarAuth(email);
    if (!au) {
      const cr = await fetch(`${SB_URL}/auth/v1/admin/users`, { method: "POST", headers: H,
        body: JSON.stringify({ email, password: pass, email_confirm: true, user_metadata: { prep: true, nombre: b.nombre } }) });
      if (!cr.ok) return J({ ok: false, error: "No se pudo crear la cuenta: " + (await cr.text()).slice(0, 200) }, 500);
      au = await cr.json();
    } else {
      const up = await fetch(`${SB_URL}/auth/v1/admin/users/${au.id}`, { method: "PUT", headers: H, body: JSON.stringify({ password: pass }) });
      if (!up.ok) return J({ ok: false, error: "No se pudo asignar la clave: " + (await up.text()).slice(0, 200) }, 500);
    }
    const row = { email, nombre: String(b.nombre).trim(), rol_sistema: rol, marca_id: rol === "superadmin" ? null : (b.marca_id || null),
      local_id: rol === "superadmin" ? null : (b.local_id || null), rol_id: rol === "operativo" ? (b.rol_id || null) : null,
      empleado_id: b.empleado_id || null, permisos: rol === "operativo" && b.permisos && typeof b.permisos === "object" ? b.permisos : null,
      activo: b.activo !== false, puesto: b.puesto || null, must_change_pw: true };
    const ins = await fetch(`${SB_URL}/rest/v1/prep_usuarios`, { method: "POST", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(row) });
    if (!ins.ok) return J({ ok: false, error: "No se pudo guardar el usuario: " + (await ins.text()).slice(0, 200) }, 500);
    const accesos = [row.marca_id].filter((m) => m && URLS[m]).map((m) => ({ nombre: URLS[m!][0], url: URLS[m!][1] }));
    return J({ ok: true, usuario: (await ins.json())[0], to: email, nombre: row.nombre, password: pass, accesos: accesos.length ? accesos : [{ nombre: "Prep", url: "https://os.prep.rest" }], multi: false });
  }

  if (b.accion === "quitar") {
    const u = (await q(`prep_usuarios?id=eq.${encodeURIComponent(b.id || "")}&select=id,email,rol_sistema,marca_id`))[0];
    if (!u) return J({ ok: false, error: "No existe." }, 404);
    const email = (u.email || "").toLowerCase();
    if (email === cEmail) return J({ ok: false, error: "No puedes quitarte a ti mismo." }, 400);
    if (!esSuper && (u.rol_sistema === "superadmin" || !misMarcas.includes(u.marca_id))) return J({ ok: false, error: "Solo puedes quitar usuarios de tu restaurante." }, 403);
    if (email) await fetch(`${SB_URL}/rest/v1/prep_usuario_marcas?email=eq.${encodeURIComponent(email)}`, { method: "DELETE", headers: H });
    const del = await fetch(`${SB_URL}/rest/v1/prep_usuarios?id=eq.${u.id}`, { method: "DELETE", headers: H });
    if (!del.ok) return J({ ok: false, error: "No se pudo quitar: " + (await del.text()).slice(0, 200) }, 500);
    let cuenta = "se mantiene";
    if (email) { const au = await buscarAuth(email);
      if (au && au.user_metadata && au.user_metadata.prep === true) {
        const d = await fetch(`${SB_URL}/auth/v1/admin/users/${au.id}`, { method: "DELETE", headers: H }); cuenta = d.ok ? "borrada" : "se mantiene"; } }
    return J({ ok: true, cuenta });
  }
  return J({ ok: false, error: "Acción desconocida." }, 400);
});
