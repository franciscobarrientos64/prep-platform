// Reportes programados de Prep!: arma reportes de cada módulo con los datos reales del local
// y los envía a cada persona suscrita por email (Resend) o WhatsApp (Meta Cloud API).
// Modos (body.modo):
//   cron     (por defecto) → revisa rep_suscripciones vencidas (hora de Lima) y envía. Lo llama pg_cron cada 15 min.
//   preview  → devuelve {html, texto} de una selección de reportes (requiere sesión con acceso al local).
//   enviar   → envía ahora una suscripción como prueba (requiere sesión con acceso al local).
// Llaves (secrets de la función, nunca en el código): RESEND_API_KEY, REPORTE_FROM, WA_TOKEN, WA_PHONE_ID.
// Si falta una llave, el envío queda en rep_envios como 'pendiente_llave' y no se rompe nada.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const RESEND = Deno.env.get("RESEND_API_KEY");
const FROM = Deno.env.get("REPORTE_FROM") || "Prep! <reportes@prep.rest>";
const WA_TOKEN = Deno.env.get("WA_TOKEN");
const WA_PHONE_ID = Deno.env.get("WA_PHONE_ID");
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST,OPTIONS" };

// ---------- helpers ----------
const H = { apikey: SRK, Authorization: `Bearer ${SRK}` };
async function q(path: string): Promise<any[]> {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: H });
  if (!r.ok) { console.error("q", path, r.status, await r.text()); return []; }
  return await r.json();
}
async function qAll(path: string): Promise<any[]> {
  const out: any[] = [];
  for (let off = 0; ; off += 1000) {
    const rows = await q(`${path}${path.includes("?") ? "&" : "?"}limit=1000&offset=${off}`);
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}
async function ins(table: string, row: any) {
  await fetch(`${SB_URL}/rest/v1/${table}`, { method: "POST", headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(row) });
}
async function patch(table: string, filter: string, row: any) {
  await fetch(`${SB_URL}/rest/v1/${table}?${filter}`, { method: "PATCH", headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(row) });
}
const enc = encodeURIComponent;
function esc(s: any) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function money(n: number) { return "S/ " + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function num(n: number, d = 1) { return Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: d }); }
function lima() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short" })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  const fecha = `${p.year}-${p.month}-${p.day}`;
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return { fecha, hhmm: `${p.hour === "24" ? "00" : p.hour}:${p.minute}`, dow, dia: Number(p.day) };
}
function addD(iso: string, n: number) { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function fmtFecha(iso: string) { const d = new Date(iso + "T12:00:00Z"); return d.toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }); }
// Día operativo de un bar: de 06:00 a 06:00 (Lima = UTC-5 → 11:00Z).
function periodo(frec: string, hoy: string) {
  const dias = frec === "mensual" ? 30 : frec === "semanal" ? 7 : 1;
  const ini = addD(hoy, -dias), fin = hoy;
  const label = dias === 1 ? `Noche del ${fmtFecha(ini)}` : `Últimos ${dias} días (${fmtFecha(ini)} – ${fmtFecha(addD(fin, -1))})`;
  return { ini, fin, tIni: `${ini}T11:00:00Z`, tFin: `${fin}T11:00:00Z`, label, dias };
}

type Sec = { titulo: string; kpis?: [string, string][]; filas?: string[][]; cab?: string[]; nota?: string; vacio?: string };

// ---------- secciones ----------
async function ctxDatos(local: string, marca: string, per: any, cache: any) {
  if (cache.items) return cache;
  const peds = await qAll(`ca_pedidos?select=id,total,comensales,propina_monto,mozo_id&local_id=eq.${local}&estado=eq.cerrada&cerrada_at=gte.${enc(per.tIni)}&cerrada_at=lt.${enc(per.tFin)}`);
  const items = await qAll(`ca_pedido_items?select=nombre,qty,precio_total,receta_id,estado,ca_pedidos!inner(local_id,estado,cerrada_at)&ca_pedidos.local_id=eq.${local}&ca_pedidos.estado=eq.cerrada&ca_pedidos.cerrada_at=gte.${enc(per.tIni)}&ca_pedidos.cerrada_at=lt.${enc(per.tFin)}&estado=neq.cancelado`);
  const recetas = await q(`inv_recetas?select=id,nombre,ingredientes,estacion_id,categoria_menu&marca_id=eq.${marca}`);
  const prods = await q(`inv_productos?select=id,nombre,unidad,costo,par_level&marca_id=eq.${marca}`);
  Object.assign(cache, { peds, items, recetas, prods });
  return cache;
}
function costoReceta(c: any, rid: string) {
  const r = c.recetas.find((x: any) => x.id === rid); if (!r || !Array.isArray(r.ingredientes)) return 0;
  return r.ingredientes.reduce((a: number, ing: any) => {
    if (!ing.pid) return a; const p = c.prods.find((x: any) => x.id === ing.pid); const m = Number(ing.merma || 0);
    const f = m > 0 && m < 100 ? 1 / (1 - m / 100) : 1; return a + Number(ing.cantidad || 0) * f * Number(p?.costo || 0);
  }, 0);
}
function esBar(r: any) { return !!r && (/bar|servicio|bebida|drink/i.test(r.estacion_id || "") || /c[oó]ctel|sour|bebida|cerveza|vino|alcohol|cl[aá]sico/i.test(r.categoria_menu || "")); }

const SECCIONES: Record<string, (l: string, m: string, per: any, hoy: string, c: any) => Promise<Sec>> = {
  async ventas(l, m, per, _h, c) {
    await ctxDatos(l, m, per, c);
    const v = c.peds.reduce((a: number, p: any) => a + Number(p.total || 0), 0);
    const pax = c.peds.reduce((a: number, p: any) => a + Number(p.comensales || 0), 0);
    const prop = c.peds.reduce((a: number, p: any) => a + Number(p.propina_monto || 0), 0);
    const top: Record<string, number> = {}; c.items.forEach((i: any) => top[i.nombre] = (top[i.nombre] || 0) + Number(i.qty || 0));
    const t = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (!c.peds.length) return { titulo: "Ventas", vacio: "Sin cuentas cerradas en el periodo." };
    return { titulo: "Ventas", kpis: [["Venta", money(v)], ["Cuentas", num(c.peds.length, 0)], ["Comensales", num(pax, 0)], ["Por persona", money(pax ? v / pax : 0)], ["Ticket por mesa", money(v / c.peds.length)], ["Propinas", money(prop)]],
      cab: ["Más vendidos", "Unidades"], filas: t.map(([n, q]) => [n, num(q, 0)]) };
  },
  async costos(l, m, per, _h, c) {
    await ctxDatos(l, m, per, c);
    let venta = 0, cmv = 0, vBar = 0, cBar = 0;
    c.items.forEach((i: any) => {
      const q = Number(i.qty || 0), pv = Number(i.precio_total || 0) / 1.18, co = costoReceta(c, i.receta_id) * q;
      venta += pv; cmv += co; const r = c.recetas.find((x: any) => x.id === i.receta_id);
      if (esBar(r)) { vBar += pv; cBar += co; }
    });
    if (!venta) return { titulo: "Costos y pour cost", vacio: "Sin ventas en el periodo." };
    const pc = vBar ? cBar / vBar * 100 : 0;
    return { titulo: "Costos y pour cost", kpis: [["Venta sin IGV", money(venta)], ["Costo de insumos", money(cmv)], ["Food cost", num(cmv / venta * 100) + "%"], ["Pour cost de barra", num(pc) + "%"]],
      nota: pc > 24 ? "El pour cost está sobre la referencia de 18–24%. Revisa medidas de servido y cortesías." : "Pour cost dentro de la referencia de 18–24%." };
  },
  async inventario(l, m, _per, _h, c) {
    if (!c.prods) c.prods = await q(`inv_productos?select=id,nombre,unidad,costo,par_level&marca_id=eq.${m}`);
    const par = await q(`inv_par_local?select=producto_id,minimo,par&local_id=eq.${l}`);
    const st = await q(`inv_stock_actual?select=producto_id,stock&local_id=eq.${l}`);
    const pm: any = {}; par.forEach((x: any) => pm[x.producto_id] = x); const sm: any = {}; st.forEach((x: any) => sm[x.producto_id] = Number(x.stock || 0));
    let valor = 0; const bajo: any[] = [];
    c.prods.forEach((p: any) => {
      const s = sm[p.id] || 0; valor += s * Number(p.costo || 0);
      const mn = pm[p.id] ? Number(pm[p.id].minimo || 0) : Number(p.par_level || 0); const pr = pm[p.id] ? Number(pm[p.id].par || 0) : Number(p.par_level || 0);
      if (mn > 0 && s < mn) bajo.push({ p, s, mn, falta: Math.max(0, pr - s) });
    });
    bajo.sort((a, b) => b.falta * Number(b.p.costo || 0) - a.falta * Number(a.p.costo || 0));
    return { titulo: "Inventario bajo mínimo", kpis: [["Bajo mínimo", num(bajo.length, 0)], ["Valor del inventario", money(valor)], ["Reponer al PAR", money(bajo.reduce((a, b) => a + b.falta * Number(b.p.costo || 0), 0))]],
      cab: ["Insumo", "Stock", "Mínimo", "Falta al PAR"], filas: bajo.slice(0, 15).map((b) => [b.p.nombre, `${num(b.s)} ${b.p.unidad || ""}`, num(b.mn), num(b.falta)]),
      vacio: bajo.length ? undefined : "Todo el inventario está sobre el mínimo." };
  },
  async mermas(l, m, per, _h, c) {
    const rows = await q(`inv_mermas?select=producto_id,cantidad,motivo,valor_perdido,area&local_id=eq.${l}&fecha=gte.${per.ini}&fecha=lt.${per.fin}&order=valor_perdido.desc`);
    if (!rows.length) return { titulo: "Mermas", vacio: "Sin mermas registradas en el periodo." };
    if (!c.prods) c.prods = await q(`inv_productos?select=id,nombre,unidad,costo,par_level&marca_id=eq.${m}`);
    const nom = (id: string) => c.prods.find((p: any) => p.id === id)?.nombre || id;
    return { titulo: "Mermas", kpis: [["Registros", num(rows.length, 0)], ["Valor perdido", money(rows.reduce((a, r) => a + Number(r.valor_perdido || 0), 0))]],
      cab: ["Insumo", "Motivo", "Valor"], filas: rows.slice(0, 10).map((r) => [nom(r.producto_id), r.motivo || "—", money(r.valor_perdido)]) };
  },
  async compras(l, _m, _per, hoy) {
    const oc = await q(`inv_ordenes_compra?select=numero,proveedor_id,estado,total,fecha_entrega,pago_estado&local_id=eq.${l}&estado=neq.cancelada&order=fecha_entrega.asc`);
    const prov = await q(`inv_proveedores?select=id,nombre`); const pn = (id: string) => prov.find((p: any) => p.id === id)?.nombre || id || "—";
    const pend = oc.filter((o) => ["borrador", "aprobada", "enviada"].includes(o.estado));
    const porPagar = oc.filter((o) => o.estado === "recibida" && o.pago_estado !== "pagado");
    const hoyE = pend.filter((o) => o.fecha_entrega === hoy);
    return { titulo: "Compras", kpis: [["Órdenes abiertas", num(pend.length, 0)], ["Llegan hoy", num(hoyE.length, 0)], ["Por pagar", money(porPagar.reduce((a, o) => a + Number(o.total || 0), 0))]],
      cab: ["Orden", "Proveedor", "Estado", "Entrega", "Total"], filas: pend.slice(0, 10).map((o) => [o.numero || "—", pn(o.proveedor_id), o.estado, o.fecha_entrega ? fmtFecha(o.fecha_entrega) : "—", money(o.total)]),
      vacio: pend.length ? undefined : "Sin órdenes de compra abiertas." };
  },
  async reservas(l, _m, _per, hoy) {
    const man = addD(hoy, 1);
    const rows = await q(`ms_reservas?select=fecha,hora,comensales,estado,ocasion,notas,alergias_snapshot,vip_snapshot,ms_clientes(nombre,apellidos)&local_id=eq.${l}&fecha=gte.${hoy}&fecha=lte.${man}&estado=not.in.(cancelada,no_show)&order=fecha.asc,hora.asc`);
    const pax = (f: string) => rows.filter((r) => r.fecha === f).reduce((a, r) => a + Number(r.comensales || 0), 0);
    if (!rows.length) return { titulo: "Reservas", vacio: "Sin reservas para hoy ni mañana." };
    return { titulo: "Reservas", kpis: [["Hoy", `${rows.filter((r) => r.fecha === hoy).length} reservas · ${pax(hoy)} pax`], ["Mañana", `${rows.filter((r) => r.fecha === man).length} reservas · ${pax(man)} pax`]],
      cab: ["Día", "Hora", "Nombre", "Pax", "Detalle"],
      filas: rows.slice(0, 20).map((r) => [r.fecha === hoy ? "Hoy" : "Mañana", String(r.hora || "").slice(0, 5), [r.ms_clientes?.nombre, r.ms_clientes?.apellidos].filter(Boolean).join(" ") || "—", num(r.comensales, 0),
        [r.vip_snapshot ? "VIP" : "", r.ocasion || "", (r.alergias_snapshot || []).length ? "Alergia: " + r.alergias_snapshot.join(", ") : ""].filter(Boolean).join(" · ") || "—"]) };
  },
  async equipo(l, _m, per, hoy) {
    const emp = await q(`rrhh_empleados?select=id,nombre,apellidos,rol&local_id=eq.${l}&estado=eq.activo`); const en = (id: string) => { const e = emp.find((x: any) => x.id === id); return e ? `${e.nombre} ${(e.apellidos || "").split(" ")[0]}` : id; };
    const prog = await q(`rrhh_programacion?select=empleado_id,turno,hora_ini,hora_fin,rol&local_id=eq.${l}&fecha=eq.${hoy}&order=hora_ini.asc`);
    const asis = await q(`rrhh_asistencia?select=empleado_id,notas,fuera_de_geofence&local_id=eq.${l}&fecha=gte.${per.ini}&fecha=lt.${per.fin}`);
    const tard = asis.filter((a) => /tard/i.test(a.notas || ""));
    const perm = await q(`rrhh_permisos?select=empleado_id,tipo,fecha_inicio,dias&local_id=eq.${l}&estado=eq.pendiente`);
    return { titulo: "Equipo y asistencia", kpis: [["Programados hoy", num(prog.length, 0)], ["Marcaciones", num(asis.length, 0)], ["Tardanzas", num(tard.length, 0)], ["Permisos por aprobar", num(perm.length, 0)]],
      cab: ["Hoy trabaja", "Puesto", "Horario"], filas: prog.slice(0, 20).map((p) => [en(p.empleado_id), p.rol || emp.find((e: any) => e.id === p.empleado_id)?.rol || "—", `${p.hora_ini || ""}–${p.hora_fin || ""}`]),
      nota: tard.length ? "Tardanzas: " + tard.map((t) => en(t.empleado_id)).join(", ") : undefined };
  },
  async caja(l, _m, per) {
    const g = await q(`vu_gastos?select=monto,categoria,descripcion,estado&local_id=eq.${l}&fecha=gte.${per.ini}&fecha=lt.${per.fin}&estado=neq.rechazado`);
    if (!g.length) return { titulo: "Caja chica", vacio: "Sin gastos de caja chica en el periodo." };
    const cat: Record<string, number> = {}; g.forEach((x) => cat[x.categoria || "Otros"] = (cat[x.categoria || "Otros"] || 0) + Number(x.monto || 0));
    return { titulo: "Caja chica", kpis: [["Gastado", money(g.reduce((a, x) => a + Number(x.monto || 0), 0))], ["Por aprobar", num(g.filter((x) => x.estado === "registrado" || x.estado === "pendiente").length, 0)]],
      cab: ["Categoría", "Monto"], filas: Object.entries(cat).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, money(v)]) };
  },
  async voz(l, m, per) {
    const its = await qAll(`vc_resp_items?select=valor_num,respuesta_id,vc_preguntas!inner(tipo),vc_respuestas!inner(local_id,created_at,atendida,mesa,mozo,contacto_nombre)&vc_preguntas.tipo=eq.nps&vc_respuestas.local_id=eq.${l}&vc_respuestas.created_at=gte.${enc(per.tIni)}&vc_respuestas.created_at=lt.${enc(per.tFin)}`);
    const n = its.length, pro = its.filter((i) => i.valor_num >= 9).length, det = its.filter((i) => i.valor_num <= 6).length;
    const alert = its.filter((i) => i.valor_num <= 6 && !i.vc_respuestas?.atendida);
    const res = await q(`eng_resenas?select=fuente,rating,nombre,comentario,estado,fecha&marca_id=eq.${m}&fecha=gte.${addD(per.ini, -6)}&order=fecha.desc`);
    const sinResp = await q(`eng_resenas?select=id&marca_id=eq.${m}&estado=neq.respondida`);
    const filas = [
      ...alert.slice(0, 5).map((a) => ["Encuesta", `NPS ${a.valor_num}`, `${a.vc_respuestas?.contacto_nombre || "Anónimo"} · mesa ${a.vc_respuestas?.mesa || "—"} · ${a.vc_respuestas?.mozo || ""}`]),
      ...res.slice(0, 5).map((r) => [r.fuente || "Reseña", "★".repeat(Number(r.rating || 0)), `${r.nombre || ""}: ${String(r.comentario || "").slice(0, 90)}`]),
    ];
    return { titulo: "Lo que dice el cliente", kpis: [["Encuestas", num(n, 0)], ["NPS", n ? num(Math.round((pro - det) / n * 100), 0) : "—"], ["Alertas sin atender", num(alert.length, 0)], ["Reseñas sin responder", num(sinResp.length, 0)]],
      cab: ["Fuente", "Nota", "Comentario"], filas, vacio: filas.length ? undefined : "Sin encuestas ni reseñas nuevas." };
  },
  async mystery(l) {
    const v = await q(`mys_visitas?select=fecha,turno,score_total,resumen&local_id=eq.${l}&order=fecha.desc&limit=3`);
    if (!v.length) return { titulo: "Mystery shopper", vacio: "Sin evaluaciones registradas." };
    return { titulo: "Mystery shopper", kpis: [["Última evaluación", num(v[0].score_total) + " pts"]], cab: ["Fecha", "Turno", "Puntaje", "Resumen"],
      filas: v.map((x) => [fmtFecha(x.fecha), x.turno || "—", num(x.score_total), String(x.resumen || "").slice(0, 100)]) };
  },
};
const ORDEN = ["ventas", "costos", "inventario", "compras", "mermas", "reservas", "equipo", "caja", "voz", "mystery"];

async function armar(local: string, marca: string, reportes: string[], frec: string, titulo?: string) {
  const hoy = lima().fecha; const per = periodo(frec, hoy);
  const cfg = (await q(`config_local?select=nombre_comercial&local_id=eq.${local}`))[0] || {};
  const nombre = cfg.nombre_comercial || "Prep!";
  const cache: any = {}; const secs: Sec[] = [];
  for (const k of ORDEN) if (reportes.includes(k) && SECCIONES[k]) { try { secs.push(await SECCIONES[k](local, marca, per, hoy, cache)); } catch (e) { secs.push({ titulo: k, vacio: "No se pudo armar: " + (e as Error).message }); } }
  const tit = titulo || (frec === "diaria" ? "Reporte diario" : frec === "semanal" ? "Reporte semanal" : "Reporte mensual");
  const asunto = `${tit} · ${nombre} · ${per.label}`;
  // texto (WhatsApp)
  const texto = [`*${tit} · ${nombre}*`, per.label, "", ...secs.flatMap((s) => [
    `*${s.titulo}*`, ...(s.kpis || []).map(([k, v]) => `• ${k}: ${v}`),
    ...(s.filas || []).slice(0, 8).map((f) => `  – ${f.join(" · ")}`), ...(s.vacio ? [s.vacio] : []), ...(s.nota ? [`_${s.nota}_`] : []), ""]), "Enviado por Prep!"].join("\n");
  // html (email)
  const th = "padding:6px 8px;border-bottom:2px solid #171c20;text-align:left;font-size:12px";
  const td = "padding:6px 8px;border-bottom:1px solid #e3e6ea;font-size:13px";
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:auto;color:#171c20">
  <div style="background:#1e5af9;color:#fff;padding:18px 20px;border:2px solid #171c20;border-radius:12px 12px 0 0"><div style="font-size:20px;font-weight:700">${esc(tit)}</div><div style="font-family:monospace;font-size:13px;opacity:.9">${esc(nombre)} · ${esc(per.label)}</div></div>
  <div style="border:2px solid #171c20;border-top:0;padding:8px 20px 18px;border-radius:0 0 12px 12px;background:#fff">
  ${secs.map((s) => `<h3 style="margin:18px 0 8px;font-size:16px">${esc(s.titulo)}</h3>
    ${s.kpis?.length ? `<table style="border-collapse:collapse;width:100%;margin-bottom:6px"><tr>${s.kpis.map(([k, v]) => `<td style="padding:6px 8px;vertical-align:top"><div style="font-size:18px;font-weight:700;color:#1e5af9">${esc(v)}</div><div style="font-size:11px;color:#5d636b">${esc(k)}</div></td>`).join("")}</tr></table>` : ""}
    ${s.filas?.length ? `<table style="border-collapse:collapse;width:100%">${s.cab ? `<tr>${s.cab.map((c) => `<th style="${th}">${esc(c)}</th>`).join("")}</tr>` : ""}${s.filas.map((f) => `<tr>${f.map((c) => `<td style="${td}">${esc(c)}</td>`).join("")}</tr>`).join("")}</table>` : ""}
    ${s.vacio ? `<p style="font-size:13px;color:#5d636b">${esc(s.vacio)}</p>` : ""}${s.nota ? `<p style="font-size:13px;background:#fff3c2;padding:8px 10px;border-radius:8px">${esc(s.nota)}</p>` : ""}`).join("")}
  <p style="font-family:monospace;font-size:11px;color:#888;margin-top:18px">Enviado por Prep! · prep.rest</p></div></div>`;
  return { asunto, texto, html, periodo: per.label };
}

function soloDigitos(t: string) { let d = String(t || "").replace(/\D/g, ""); if (d.length === 9) d = "51" + d; return d; }
async function enviarSub(s: any, origen: string) {
  const r = await armar(s.local_id, s.marca_id, s.reportes || [], s.frecuencia, s.titulo);
  const res: any[] = [];
  const log = async (canal: string, destino: string, estado: string, detalle: string) => {
    res.push({ canal, destino, estado, detalle });
    await ins("rep_envios", { suscripcion_id: s.id, marca_id: s.marca_id, local_id: s.local_id, canal, destino, estado, detalle: String(detalle || "").slice(0, 500), asunto: r.asunto, texto: r.texto, origen });
  };
  if ((s.canal === "email" || s.canal === "ambos")) {
    if (!s.email) await log("email", "", "error", "La persona no tiene email");
    else if (!RESEND) await log("email", s.email, "pendiente_llave", "Falta RESEND_API_KEY para enviar emails");
    else { const rr = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: FROM, to: [s.email], subject: r.asunto, html: r.html, text: r.texto }) });
      await log("email", s.email, rr.ok ? "enviado" : "error", await rr.text()); }
  }
  if ((s.canal === "whatsapp" || s.canal === "ambos")) {
    const to = soloDigitos(s.whatsapp);
    if (!to) await log("whatsapp", "", "error", "La persona no tiene WhatsApp");
    else if (!WA_TOKEN || !WA_PHONE_ID) await log("whatsapp", to, "pendiente_llave", "Faltan WA_TOKEN y WA_PHONE_ID (Meta Cloud API)");
    else { const rr = await fetch(`https://graph.facebook.com/v20.0/${WA_PHONE_ID}/messages`, { method: "POST", headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { preview_url: false, body: r.texto.slice(0, 4000) } }) });
      await log("whatsapp", to, rr.ok ? "enviado" : "error", await rr.text()); }
  }
  return { ...r, envios: res };
}
function vence(s: any, now: ReturnType<typeof lima>) {
  const hora = String(s.hora || "08:00").slice(0, 5);
  if (hora > now.hhmm) return false;
  const [h, m] = hora.split(":").map(Number), [nh, nm] = now.hhmm.split(":").map(Number);
  if ((nh * 60 + nm) - (h * 60 + m) > 180) return false; // no reenvía reportes atrasados más de 3 h
  if (s.frecuencia === "semanal" && Number(s.dia_semana ?? 1) !== now.dow) return false;
  if (s.frecuencia === "mensual" && Number(s.dia_mes ?? 1) !== now.dia) return false;
  if (s.ultimo_envio) { const u = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date(s.ultimo_envio)); if (u === now.fecha) return false; }
  return true;
}
async function puedeLocal(req: Request, local: string) {
  const auth = req.headers.get("Authorization") || ""; if (!auth.startsWith("Bearer ")) return false;
  const r = await fetch(`${SB_URL}/rest/v1/rpc/prep_can_local`, { method: "POST", headers: { apikey: ANON || req.headers.get("apikey") || "", Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify({ l: local }) });
  return r.ok && (await r.json()) === true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (o: any, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { ...cors, "Content-Type": "application/json" } });
  let body: any = {}; try { body = await req.json(); } catch (_) { /* cron sin body */ }
  const modo = body.modo || "cron";
  try {
    if (modo === "preview") {
      if (!body.local_id || !(await puedeLocal(req, body.local_id))) return json({ ok: false, error: "Sin acceso a este local" }, 403);
      const r = await armar(body.local_id, body.marca_id, body.reportes || [], body.frecuencia || "diaria", body.titulo);
      return json({ ok: true, ...r });
    }
    if (modo === "enviar") {
      const s = (await q(`rep_suscripciones?id=eq.${enc(body.suscripcion_id || "")}&select=*`))[0];
      if (!s) return json({ ok: false, error: "Suscripción no encontrada" }, 404);
      if (!(await puedeLocal(req, s.local_id))) return json({ ok: false, error: "Sin acceso a este local" }, 403);
      const r = await enviarSub(s, "prueba");
      return json({ ok: true, ...r });
    }
    // cron: solo envía lo que ya venció y no se envió hoy, así que llamarlo de más no duplica nada.
    const now = lima();
    const subs = await q(`rep_suscripciones?activo=eq.true&select=*`);
    const out: any[] = [];
    for (const s of subs) {
      if (!vence(s, now)) continue;
      await patch("rep_suscripciones", `id=eq.${s.id}`, { ultimo_envio: new Date().toISOString() });
      const r = await enviarSub(s, "programado");
      out.push({ id: s.id, nombre: s.nombre, envios: r.envios });
    }
    return json({ ok: true, ahora: now, enviados: out });
  } catch (e) {
    console.error(e); return json({ ok: false, error: (e as Error).message }, 500);
  }
});
