// Service Worker de Prep — Nivel 1 offline (app shell + assets).
// Estrategia: navegaciones = network-first (deploys frescos) con fallback a caché;
// assets/CDN/fuentes = stale-while-revalidate. La data de Supabase NO se cachea (siempre red).
const V = 'prep-cache-v2';
const PRECACHE = ['/', '/logo.png', '/auth-guard.js', '/tenant.js', '/client-name.js', '/offline.js', '/manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(PRECACHE).catch(()=>{})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                 // no tocar POST/PATCH (escrituras Supabase)
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co')) return;  // datos: siempre red (offline lo maneja el Nivel 2)

  if (req.mode === 'navigate') {                      // pantallas: red primero, caché de respaldo
    e.respondWith(
      fetch(req).then(r => { const cp = r.clone(); caches.open(V).then(c => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then(r => r || caches.match('/')))
    );
    return;
  }
  // assets estáticos / CDN / fuentes: servir de caché y refrescar en segundo plano
  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(r => {
        if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(V).then(c => c.put(req, cp)); }
        return r;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
