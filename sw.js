// Service Worker de Prep — app shell offline (POS y Línea abren sin internet).
// Navegaciones: red primero con tope de 4 s (una red lenta no cuelga la apertura) y respaldo en caché.
// Assets/CDN/fuentes: stale-while-revalidate. La data de Supabase NO se cachea aquí (la maneja prep-sync.js).
const V = 'prep-cache-v4';
// Versión fija de supabase-js: la misma URL que cargan POS y Línea, para que quede en caché.
const SUPA = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js';
const PRECACHE = ['/', '/pos', '/pos-v2', '/pos-v2.html', '/kds', '/linea', '/kds.html',
  '/logo.png', '/manifest.webmanifest', '/offline.js', '/prep-sync.js', '/auth-guard.js',
  '/tenant.js', '/client-name.js', '/role-view.js', SUPA];

self.addEventListener('install', e => {
  // de a uno: si un archivo falla, el resto igual queda en caché
  e.waitUntil(caches.open(V).then(c => Promise.all(PRECACHE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function timeout(p, ms) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]); }

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                 // no tocar POST/PATCH (escrituras Supabase)
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co')) return;  // datos: siempre red (offline lo maneja prep-sync.js)

  if (req.mode === 'navigate') {
    const net = fetch(req).then(r => {
      if (r && r.ok && !r.redirected && url.origin === location.origin) {
        const cp = r.clone(); caches.open(V).then(c => c.put(url.pathname, cp));
      }
      return r;
    });
    const fromCache = () => caches.match(url.pathname).then(r => r || caches.match(req, { ignoreSearch: true }));
    e.respondWith(
      timeout(net, 4000).catch(() => fromCache().then(r => r || net.catch(() => caches.match('/'))))
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
