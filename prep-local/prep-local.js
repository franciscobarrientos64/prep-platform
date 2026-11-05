// Prep Local — la central del local. Corre en la laptop de caja (Windows) con Node 18+.
//
// Qué hace:
//  1. Sirve Prep por el wifi del local (http://IP-DE-LA-LAPTOP:8080). Guarda una copia de cada
//     pantalla y de sus librerías, así abre aunque se caiga el internet.
//  2. Reparte al instante entre los equipos del local (celulares, tablets, laptop) cada cambio
//     de pedidos, aunque no haya internet. Guarda la cola en disco.
//  3. Un equipo con sesión sube la cola a Prep en el mismo orden en que llegó (prep-sync.js).
//  4. Imprime las comandas directo en las térmicas instaladas en Windows, sin diálogo.
//
// No usa paquetes externos. Datos en ./datos (config, cola, copia de la app).
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');

const VERSION = '2026.11.05';
const DIR = __dirname;
const DATA = path.join(DIR, 'datos');
const CACHE = path.join(DATA, 'copia');
const CFG_FILE = path.join(DATA, 'config.json');
const COLA_FILE = path.join(DATA, 'cola.json');
fs.mkdirSync(CACHE, { recursive: true });
// Registro en datos/registro.txt (al arrancar oculto no hay ventana donde leer errores)
const LOGF = path.join(DATA, 'registro.txt');
function logArchivo(nivel, args) { try { fs.appendFileSync(LOGF, new Date().toISOString() + ' ' + nivel + ' ' + args.map(a => a && a.stack ? a.stack : String(a)).join(' ') + '\n'); } catch (e) {} }
try { if (fs.existsSync(LOGF) && fs.statSync(LOGF).size > 2e6) fs.renameSync(LOGF, LOGF + '.anterior'); } catch (e) {}
const _log = console.log, _err = console.error;
console.log = (...a) => { logArchivo('INFO', a); _log(...a); };
console.error = (...a) => { logArchivo('ERROR', a); _err(...a); };
process.on('uncaughtException', e => { logArchivo('FATAL', [e]); _err(e); if (e && e.code === 'EADDRINUSE') { _err('El puerto 8080 ya esta en uso: Prep Local ya esta corriendo.'); process.exit(1); } });
process.on('unhandledRejection', e => logArchivo('ERROR', [e]));

// ---------- Configuración ----------
const DEF = { puerto: 8080, origen: 'https://os.prep.rest', marca: 'm6', local: 'l11',
  pin: String(Math.floor(100000 + Math.random() * 900000)), tokens: {},
  impresora_default: '', estaciones: {} /* id -> {nombre, impresora} */, columnas: 48 };
let CFG = Object.assign({}, DEF);
try { CFG = Object.assign({}, DEF, JSON.parse(fs.readFileSync(CFG_FILE, 'utf8'))); } catch (e) {}
function saveCfg() { fs.writeFileSync(CFG_FILE, JSON.stringify(CFG, null, 2)); }
saveCfg();

// ---------- Cola de operaciones ----------
// op = {seq, dev, at, st:'pend'|'ok'|'fail', err, table, op, values, match, onConflict}
let COLA = { seq: 0, ops: [] };
try { COLA = JSON.parse(fs.readFileSync(COLA_FILE, 'utf8')); } catch (e) {}
let saveT = null;
function saveCola() {
  if (saveT) return;
  saveT = setTimeout(() => {
    saveT = null;
    // se guarda todo lo pendiente o fallido + lo confirmado de las últimas 12 h (para que los
    // equipos que se reconectan se pongan al día)
    const lim = Date.now() - 12 * 3600e3;
    COLA.ops = COLA.ops.filter(o => o.st !== 'ok' || o.at > lim);
    fs.writeFile(COLA_FILE + '.tmp', JSON.stringify(COLA), err => { if (!err) fs.rename(COLA_FILE + '.tmp', COLA_FILE, () => {}); });
  }, 300);
}
const pendientes = () => COLA.ops.filter(o => o.st === 'pend');
let LEASE = { dev: null, until: 0 };

// ---------- Equipos conectados (Server-Sent Events) ----------
const CLIENTES = new Set();
function broadcast(m) { const s = 'data: ' + JSON.stringify(m) + '\n\n'; CLIENTES.forEach(r => { try { r.write(s); } catch (e) {} }); }
setInterval(() => CLIENTES.forEach(r => { try { r.write(': latido\n\n'); } catch (e) {} }), 20000);

// ---------- Utilidades HTTP ----------
function ips() {
  const out = [];
  Object.values(os.networkInterfaces()).forEach(l => (l || []).forEach(i => { if (i.family === 'IPv4' && !i.internal) out.push(i.address); }));
  return out;
}
function esLocalhost(req) { const a = req.socket.remoteAddress || ''; return a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1'; }
function json(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); }
function body(req) {
  return new Promise((ok, ko) => { let b = ''; req.on('data', c => { b += c; if (b.length > 2e6) { ko(new Error('muy grande')); req.destroy(); } });
    req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch (e) { ko(e); } }); });
}
function tokenOk(req, url) {
  const t = req.headers['x-hub-token'] || url.searchParams.get('token') || '';
  return !!(t && CFG.tokens[t]);
}

// ---------- Copia de la app (proxy con caché) ----------
const EXT = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com', 'unpkg.com', 'cdnjs.cloudflare.com', 'code.jquery.com'];
const reExt = new RegExp('https://(' + EXT.map(h => h.replace(/\./g, '\\.')).join('|') + ')/', 'g');
function cacheFile(key) { return path.join(CACHE, crypto.createHash('sha1').update(key).digest('hex')); }
function leerCopia(key) {
  try { const meta = JSON.parse(fs.readFileSync(cacheFile(key) + '.json', 'utf8')); return { ct: meta.ct, buf: fs.readFileSync(cacheFile(key)) }; } catch (e) { return null; }
}
function guardarCopia(key, ct, buf) { try { fs.writeFileSync(cacheFile(key), buf); fs.writeFileSync(cacheFile(key) + '.json', JSON.stringify({ ct, at: Date.now() })); } catch (e) {} }
async function traer(urlStr, req) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(urlStr, { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': req.headers['user-agent'] || 'PrepLocal' } });
    if (r.status >= 500) throw new Error('upstream ' + r.status);
    const ct = r.headers.get('content-type') || 'application/octet-stream';
    let buf = Buffer.from(await r.arrayBuffer());
    if (/text\/html|text\/css|javascript|json/.test(ct)) buf = Buffer.from(buf.toString('utf8').replace(reExt, '/__ext/$1/'));
    return { status: r.status, ct, buf };
  } finally { clearTimeout(t); }
}
async function servirApp(req, res, url) {
  let destino, key, primeroCopia = false;
  if (url.pathname.startsWith('/__ext/')) {
    const resto = url.pathname.slice(7); const host = resto.split('/')[0];
    if (!EXT.includes(host)) { res.writeHead(404); return res.end(); }
    destino = 'https://' + resto + url.search; key = 'ext:' + resto + url.search; primeroCopia = true;   // librerías versionadas
  } else {
    destino = CFG.origen + url.pathname + url.search; key = 'app:' + url.pathname;                          // pantallas: primero la versión nueva
  }
  const copia = leerCopia(key);
  if (primeroCopia && copia) return enviar(res, 200, copia.ct, copia.buf, 'copia');
  try {
    const r = await traer(destino, req);
    if (r.status === 200) guardarCopia(key, r.ct, r.buf);
    if (r.status !== 200 && copia) return enviar(res, 200, copia.ct, copia.buf, 'copia');
    return enviar(res, r.status, r.ct, r.buf, 'red');
  } catch (e) {
    if (copia) return enviar(res, 200, copia.ct, copia.buf, 'copia');
    res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<meta name=viewport content="width=device-width"><body style="font-family:system-ui;padding:24px"><h2>Sin internet y sin copia de esta pantalla</h2><p>Abre esta pantalla una vez con internet para que la laptop guarde su copia.</p>');
  }
}
function enviar(res, code, ct, buf, origen) {
  res.writeHead(code, { 'Content-Type': ct, 'Cache-Control': 'no-cache', 'X-Prep-Local': origen });
  res.end(buf);
}

// ---------- Impresión ESC/POS en Windows ----------
const PS1 = path.join(DIR, 'raw-print.ps1');
const CP850 = { 'á': 0xa0, 'é': 0x82, 'í': 0xa1, 'ó': 0xa2, 'ú': 0xa3, 'ñ': 0xa4, 'Ñ': 0xa5, 'Á': 0xb5, 'É': 0x90, 'Í': 0xd6, 'Ó': 0xe0, 'Ú': 0xe9,
  'ü': 0x81, 'Ü': 0x9a, '¿': 0xa8, '¡': 0xad, '°': 0xf8, 'º': 0xa7, 'ª': 0xa6, '·': 0xfa, '×': 0x9e, '«': 0xae, '»': 0xaf, '€': 0xd5 };
function enc(txt) {
  const out = [];
  for (const ch of String(txt == null ? '' : txt)) { const c = ch.codePointAt(0);
    if (c >= 32 && c < 127) out.push(c); else if (ch === '\n') out.push(10); else if (CP850[ch] != null) out.push(CP850[ch]);
    else if (c > 0xffff || (c >= 0x2600 && c <= 0x27bf) || (c >= 0xfe00 && c <= 0xfe0f) || c === 0x200d) { /* emoji: se omite */ }
    else out.push(0x3f); }
  return Buffer.from(out);
}
function wrap(t, n) {
  const pal = String(t || '').split(/\s+/); const lin = []; let cur = '';
  pal.forEach(w => { while (w.length > n) { if (cur) { lin.push(cur); cur = ''; } lin.push(w.slice(0, n)); w = w.slice(n); }
    if (!w) return; if ((cur + ' ' + w).trim().length > n) { lin.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
  if (cur) lin.push(cur); return lin;
}
const ESC = {
  init: Buffer.from([0x1b, 0x40, 0x1b, 0x74, 0x02]),              // reset + página de códigos 850
  center: Buffer.from([0x1b, 0x61, 0x01]), left: Buffer.from([0x1b, 0x61, 0x00]),
  boldOn: Buffer.from([0x1b, 0x45, 0x01]), boldOff: Buffer.from([0x1b, 0x45, 0x00]),
  big: Buffer.from([0x1d, 0x21, 0x11]), tall: Buffer.from([0x1d, 0x21, 0x01]), normal: Buffer.from([0x1d, 0x21, 0x00]),
  cut: Buffer.from([0x1b, 0x64, 0x04, 0x1d, 0x56, 0x42, 0x00]),
};
function ticketEstacion(c, est) {
  const W = CFG.columnas || 48, parts = [ESC.init, ESC.center, ESC.big, ESC.boldOn];
  const L = t => parts.push(enc(t + '\n'));
  wrap(est.nombre || 'COCINA', Math.floor(W / 2)).forEach(L);
  parts.push(ESC.normal, ESC.boldOff, ESC.left); L('-'.repeat(W));
  parts.push(ESC.tall, ESC.boldOn);
  const izq = (c.tab ? 'Tab ' + c.tab : 'Mesa ' + c.mesa), der = '#' + (c.ticket == null ? '—' : c.ticket);
  L(izq + ' '.repeat(Math.max(1, W - izq.length - der.length)) + der);
  parts.push(ESC.normal, ESC.boldOff);
  const sub = [c.zona, c.etiqueta, c.mozo].filter(Boolean).join(' · '), hora = c.hora || '';
  L(sub.slice(0, W - hora.length - 1) + ' '.repeat(Math.max(1, W - Math.min(sub.length, W - hora.length - 1) - hora.length)) + hora);
  L('-'.repeat(W));
  (est.items || []).forEach(it => {
    parts.push(ESC.tall, ESC.boldOn);
    wrap(it.qty + 'x ' + it.nombre, W).forEach(L);
    parts.push(ESC.normal, ESC.boldOff);
    L('   ' + (it.silla ? 'Silla ' + it.silla : 'Centro · compartido') + ' · [' + (it.curso || '') + ']' + (it.urgente ? ' · ¡URGENTE!' : ''));
    if (it.mods) wrap('+ ' + it.mods, W - 3).forEach(l => L('   ' + l));
    if (it.notas) { parts.push(ESC.boldOn); wrap('» ' + it.notas, W - 3).forEach(l => L('   ' + l)); parts.push(ESC.boldOff); }
  });
  L('-'.repeat(W)); parts.push(ESC.center);
  L('prep! · ' + (est.items || []).length + ' ítem(s)');
  parts.push(ESC.cut);
  return Buffer.concat(parts);
}
function imprimirRaw(impresora, buf) {
  return new Promise((ok, ko) => {
    if (process.platform !== 'win32') return ko(new Error('La impresión directa funciona solo en Windows'));
    const tmp = path.join(os.tmpdir(), 'prep-' + crypto.randomUUID() + '.bin');
    fs.writeFileSync(tmp, buf);
    execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', PS1, '-PrinterName', impresora, '-Path', tmp],
      { timeout: 20000, windowsHide: true }, (err, out, serr) => { fs.unlink(tmp, () => {}); if (err) return ko(new Error((serr || err.message || '').trim().slice(0, 300))); ok(); });
  });
}
let IMPRESORAS = [];   // [{nombre, default}]
function listarImpresoras() {
  return new Promise(ok => {
    if (process.platform !== 'win32') return ok([]);
    execFile('powershell.exe', ['-NoProfile', '-Command', 'Get-CimInstance Win32_Printer | Select-Object Name,Default | ConvertTo-Json -Compress'],
      { timeout: 15000, windowsHide: true }, (err, out) => {
        if (err) return ok(IMPRESORAS);
        try { let a = JSON.parse(out || '[]'); if (!Array.isArray(a)) a = [a]; IMPRESORAS = a.map(p => ({ nombre: p.Name, default: !!p.Default })); } catch (e) {}
        ok(IMPRESORAS);
      });
  });
}
function impresoraPara(est) {
  const conf = CFG.estaciones[est.id] && CFG.estaciones[est.id].impresora;
  if (conf) return conf;
  if (est.impresora && IMPRESORAS.some(p => p.nombre === est.impresora)) return est.impresora;   // li_estaciones.impresora_nombre
  if (CFG.impresora_default) return CFG.impresora_default;
  const d = IMPRESORAS.find(p => p.default); return d ? d.nombre : '';
}
const puedeImprimir = () => process.platform === 'win32' && (!!CFG.impresora_default || IMPRESORAS.length > 0);
const IMPRESAS = new Map();   // id de comanda -> hora (evita imprimir dos veces si el equipo reintenta)
const LOG = [];               // últimas impresiones para la pantalla de la laptop
function logImp(m) { LOG.unshift(Object.assign({ at: new Date().toLocaleTimeString('es-PE') }, m)); LOG.length = Math.min(LOG.length, 30); }

// ---------- Rutas ----------
async function hub(req, res, url) {
  const p = url.pathname.replace(/^\/__hub\/?/, '');
  if (p === 'ping') return json(res, 200, { hub: true, version: VERSION, seq: COLA.seq, pend: pendientes().length, imprime: puedeImprimir(), paired: tokenOk(req, url) });
  if (p === 'pair' && req.method === 'POST') {
    const b = await body(req);
    if (String(b.pin || '').trim() !== String(CFG.pin)) return json(res, 403, { error: 'PIN incorrecto' });
    const tok = crypto.randomBytes(18).toString('hex');
    CFG.tokens[tok] = { dev: b.dev || '', nombre: b.nombre || '', at: new Date().toISOString() }; saveCfg();
    return json(res, 200, { token: tok });
  }
  if (p === '' || p === 'estado' || p.startsWith('admin')) return admin(req, res, url, p);
  if (!tokenOk(req, url)) return json(res, 401, { error: 'Equipo no vinculado' });

  if (p === 'stream') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write('retry: 2000\n\n');
    res.write('data: ' + JSON.stringify({ t: 'snap', seq: COLA.seq, pend: pendientes(), imprime: puedeImprimir() }) + '\n\n');
    CLIENTES.add(res); req.on('close', () => CLIENTES.delete(res));
    return;
  }
  if (p === 'ops' && req.method === 'POST') {
    const b = await body(req); const out = [];
    (b.ops || []).forEach(o => {
      if (!o || !o.table || !o.op) return;
      const op = { seq: ++COLA.seq, dev: b.dev || '', at: Date.now(), st: 'pend', table: o.table, op: o.op, values: o.values, match: o.match, onConflict: o.onConflict };
      COLA.ops.push(op); out.push(op); broadcast({ t: 'op', op });
    });
    saveCola();
    return json(res, 200, { ops: out });
  }
  if (p === 'drain' && req.method === 'POST') {
    const b = await body(req); const now = Date.now();
    if (LEASE.dev && LEASE.dev !== b.dev && LEASE.until > now) return json(res, 200, { ops: [] });
    const ops = pendientes().slice(0, 50);
    LEASE = ops.length ? { dev: b.dev, until: now + 25000 } : { dev: null, until: 0 };
    return json(res, 200, { ops });
  }
  if (p === 'ack' && req.method === 'POST') {
    const b = await body(req); const ok = new Set(b.ok || []); const fail = {};
    (b.fail || []).forEach(f => { fail[f.seq] = f.error || 'error'; });
    COLA.ops.forEach(o => { if (ok.has(o.seq)) o.st = 'ok'; else if (fail[o.seq]) { o.st = 'fail'; o.err = fail[o.seq]; } });
    if (LEASE.dev === b.dev) LEASE = { dev: null, until: 0 };
    saveCola(); broadcast({ t: 'ack', ok: [...ok], fail: b.fail || [] });
    return json(res, 200, { ok: true });
  }
  if (p === 'print' && req.method === 'POST') {
    const c = await body(req);
    if (c.id && IMPRESAS.has(c.id)) return json(res, 200, { ok: true, repetida: true });
    if (!IMPRESORAS.length) await listarImpresoras();
    const hechas = [];
    try {
      for (const est of (c.estaciones || [])) {
        const imp = impresoraPara(est);
        if (!imp) throw new Error('No hay impresora configurada para ' + (est.nombre || est.id));
        if (est.id && !CFG.estaciones[est.id]) { CFG.estaciones[est.id] = { nombre: est.nombre, impresora: '' }; saveCfg(); }
        else if (est.id && CFG.estaciones[est.id].nombre !== est.nombre) { CFG.estaciones[est.id].nombre = est.nombre; saveCfg(); }
        await imprimirRaw(imp, ticketEstacion(c, est));
        hechas.push({ estacion: est.nombre, impresora: imp });
      }
      if (c.id) { IMPRESAS.set(c.id, Date.now()); if (IMPRESAS.size > 2000) IMPRESAS.delete(IMPRESAS.keys().next().value); }
      logImp({ ok: true, txt: 'Mesa ' + c.mesa + ' #' + c.ticket + ' → ' + hechas.map(h => h.estacion + ' (' + h.impresora + ')').join(', ') });
      return json(res, 200, { ok: true, impresas: hechas });
    } catch (e) {
      logImp({ ok: false, txt: 'Mesa ' + c.mesa + ' #' + c.ticket + ': ' + e.message });
      return json(res, 500, { ok: false, error: e.message, impresas: hechas });
    }
  }
  return json(res, 404, { error: 'no existe' });
}

// ---------- Pantalla de la laptop (solo desde la propia laptop) ----------
async function admin(req, res, url, p) {
  if (!esLocalhost(req)) {
    res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end('<body style="font-family:system-ui;padding:24px">Esta pantalla solo se abre en la laptop de caja.</body>');
  }
  if (p === 'admin/config' && req.method === 'POST') {
    const b = await body(req);
    if (typeof b.impresora_default === 'string') CFG.impresora_default = b.impresora_default;
    if (b.estaciones) Object.keys(b.estaciones).forEach(id => { CFG.estaciones[id] = Object.assign(CFG.estaciones[id] || {}, { impresora: b.estaciones[id] || '' }); });
    if (b.columnas) CFG.columnas = Math.max(32, Math.min(64, Number(b.columnas) || 48));
    if (b.nuevoPin) { CFG.pin = String(Math.floor(100000 + Math.random() * 900000)); CFG.tokens = {}; }
    saveCfg(); broadcast({ t: 'cfg', imprime: puedeImprimir() });
    return json(res, 200, { ok: true });
  }
  if (p === 'admin/prueba' && req.method === 'POST') {
    const b = await body(req);
    try {
      await imprimirRaw(b.impresora, ticketEstacion({ mesa: 'PRUEBA', ticket: 0, zona: 'Prep Local', hora: new Date().toLocaleTimeString('es-PE') },
        { nombre: 'Prueba de impresora', items: [{ qty: 1, nombre: 'Lasaña de la abuelita', silla: 2, curso: 'Fondo', notas: 'sin parmesano · ñandú áéíóú' }] }));
      logImp({ ok: true, txt: 'Prueba → ' + b.impresora }); return json(res, 200, { ok: true });
    } catch (e) { logImp({ ok: false, txt: 'Prueba ' + b.impresora + ': ' + e.message }); return json(res, 500, { ok: false, error: e.message }); }
  }
  if (p === 'admin/reintentar' && req.method === 'POST') {
    COLA.ops.forEach(o => { if (o.st === 'fail') { o.st = 'pend'; delete o.err; } }); saveCola();
    broadcast({ t: 'snap', seq: COLA.seq, pend: pendientes(), imprime: puedeImprimir() });
    return json(res, 200, { ok: true });
  }
  if (p === 'admin/estado') {
    await listarImpresoras();
    const fall = COLA.ops.filter(o => o.st === 'fail');
    return json(res, 200, { version: VERSION, ips: ips(), puerto: CFG.puerto, marca: CFG.marca, local: CFG.local, pin: CFG.pin,
      equipos: CLIENTES.size, vinculados: Object.keys(CFG.tokens).length, pend: pendientes().length,
      fallidas: fall.map(o => ({ seq: o.seq, tabla: o.table, op: o.op, err: o.err })), impresoras: IMPRESORAS,
      impresora_default: CFG.impresora_default, estaciones: CFG.estaciones, columnas: CFG.columnas, log: LOG,
      internet: await hayInternet() });
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(fs.readFileSync(path.join(DIR, 'panel.html')));
}
let NET = { ok: false, at: 0 };
async function hayInternet() {
  if (Date.now() - NET.at < 10000) return NET.ok;
  try { const c = new AbortController(); const t = setTimeout(() => c.abort(), 3000);
    const r = await fetch(CFG.origen + '/sw.js', { method: 'HEAD', signal: c.signal }); clearTimeout(t); NET = { ok: r.ok, at: Date.now() }; }
  catch (e) { NET = { ok: false, at: Date.now() }; }
  return NET.ok;
}

// ---------- Servidor ----------
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/__hub')) return await hub(req, res, url);
    if (url.pathname === '/' ) { res.writeHead(302, { Location: '/pos?marca=' + CFG.marca + '&local=' + CFG.local }); return res.end(); }
    if (url.pathname === '/sw.js') { res.writeHead(404); return res.end(); }   // en http del local no hay service worker
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    return await servirApp(req, res, url);
  } catch (e) {
    try { json(res, 500, { error: e.message }); } catch (_) {}
  }
});
server.listen(CFG.puerto, '0.0.0.0', () => {
  listarImpresoras();
  console.log('Prep Local ' + VERSION + ' listo.');
  ips().forEach(ip => console.log('  Mozos:  http://' + ip + ':' + CFG.puerto));
  console.log('  Laptop: http://localhost:' + CFG.puerto + '/__hub/   (PIN ' + CFG.pin + ')');
});
// precarga las pantallas del servicio para que existan offline desde el primer día
async function precargar() {
  const rutas = ['/pos', '/kds', '/login', '/offline.js', '/prep-sync.js', '/auth-guard.js', '/tenant.js', '/client-name.js', '/role-view.js', '/manifest.webmanifest', '/logo.png'];
  const ext = new Set();
  const juntar = (buf, ct) => { if (/html|css/.test(ct)) (buf.toString('utf8').match(/\/__ext\/[^"')\s]+/g) || []).forEach(u => ext.add(u.replace(/&amp;/g, '&'))); };
  const UA = { headers: { 'user-agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36' } };
  for (const r of rutas) { try { const x = await traer(CFG.origen + r, UA); if (x.status === 200) { guardarCopia('app:' + r, x.ct, x.buf); juntar(x.buf, x.ct); } } catch (e) {} }
  // librerías y tipografías (y lo que pidan sus hojas de estilo), dos vueltas
  for (let vuelta = 0; vuelta < 2; vuelta++) {
    for (const u of [...ext]) {
      const resto = u.slice(7), key = 'ext:' + resto;
      if (leerCopia(key)) { if (vuelta === 0) { const c = leerCopia(key); juntar(c.buf, c.ct); } continue; }
      try { const x = await traer('https://' + resto, UA); if (x.status === 200) { guardarCopia(key, x.ct, x.buf); juntar(x.buf, x.ct); } } catch (e) {}
    }
  }
}
setTimeout(precargar, 3000); setInterval(precargar, 30 * 60e3);
