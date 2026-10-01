// Alertas del turno de Prep!: avisa por WhatsApp los incidentes nuevos que detecta prep_monitor_turno()
// (pg_cron cada 2 min). Destinatarios: config_local.alerta_whatsapp del local + ALERTA_WHATSAPP_ADMIN (super admin).
// Llaves (secrets de la función): WA_TOKEN, WA_PHONE_ID, ALERTA_WHATSAPP_ADMIN (opcional).
// Sin llave, el incidente queda con notif_estado='pendiente_llave' y se ve igual en /portal › Salud del turno.
// Solo procesa incidentes ya registrados por la BD: llamarla de más no envía nada nuevo.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WA_TOKEN = Deno.env.get("WA_TOKEN");
const WA_PHONE_ID = Deno.env.get("WA_PHONE_ID");
const ADMIN = (Deno.env.get("ALERTA_WHATSAPP_ADMIN") || "").replace(/\D/g, "");
const H = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };

async function q(path: string): Promise<any[]> {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: H });
  return r.ok ? await r.json() : [];
}
async function marcar(ids: string[], estado: string, detalle: string) {
  if (!ids.length) return;
  await fetch(`${SB_URL}/rest/v1/prep_incidentes?id=in.(${ids.join(",")})`, {
    method: "PATCH", headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({ notif_estado: estado, notif_detalle: detalle.slice(0, 500), notificado_at: new Date().toISOString() }),
  });
}
async function wa(to: string, body: string): Promise<string | null> {
  const r = await fetch(`https://graph.facebook.com/v20.0/${WA_PHONE_ID}/messages`, {
    method: "POST", headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { preview_url: false, body: body.slice(0, 4000) } }),
  });
  return r.ok ? null : `${r.status} ${(await r.text()).slice(0, 200)}`;
}

Deno.serve(async () => {
  const inc = await q("prep_incidentes?resuelto_at=is.null&notif_estado=eq.pendiente&order=abierto_at&limit=200");
  if (!inc.length) return Response.json({ ok: true, enviados: 0 });
  const locales = await q("inv_locales?select=id,nombre,marca_id,inv_marcas(nombre)");
  const cfg = await q("config_local?select=local_id,alerta_whatsapp");
  const nom = (l: string | null) => {
    if (!l) return "Plataforma Prep!";
    const x = locales.find((y) => y.id === l);
    return x ? `${x.inv_marcas?.nombre || x.marca_id} · ${x.nombre}` : l;
  };
  const grupos = new Map<string, any[]>();
  for (const i of inc) { const k = i.local_id || ""; grupos.set(k, [...(grupos.get(k) || []), i]); }

  let enviados = 0;
  for (const [local, lista] of grupos) {
    const ids = lista.map((i) => i.id);
    const destinos = new Set<string>();
    const c = cfg.find((x) => x.local_id === local);
    if (c?.alerta_whatsapp) destinos.add(String(c.alerta_whatsapp).replace(/\D/g, ""));
    if (ADMIN) destinos.add(ADMIN);
    const texto = `⚠ Prep! · ${nom(local || null)}\n` +
      lista.map((i) => `${i.severidad === "critico" ? "🔴" : "🟡"} ${i.titulo}`).join("\n") +
      `\n\nRevisa: os.prep.rest/portal`;
    if (!WA_TOKEN || !WA_PHONE_ID) { await marcar(ids, "pendiente_llave", "Faltan WA_TOKEN y WA_PHONE_ID (Meta Cloud API). Texto: " + texto); continue; }
    if (!destinos.size) { await marcar(ids, "sin_destinatario", "Carga config_local.alerta_whatsapp o ALERTA_WHATSAPP_ADMIN"); continue; }
    const errores: string[] = [];
    for (const to of destinos) { const e = await wa(to, texto); if (e) errores.push(`${to}: ${e}`); else enviados++; }
    await marcar(ids, errores.length === destinos.size ? "error" : "enviado", errores.join(" | ") || [...destinos].join(", "));
  }
  return Response.json({ ok: true, enviados, incidentes: inc.length });
});
