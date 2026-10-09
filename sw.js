/* Service worker de OleoRuta
   Estrategia «primero la red»: con conexión siempre se sirve la versión publicada más reciente
   (revalidando contra el servidor, sin usar la caché HTTP del navegador); sin conexión se usa la copia guardada. */
const CACHE = 'oleoruta-v6';
const FILES = ['./', './index.html', './manifest.webmanifest', './css/styles.css', './js/data.js', './js/cloud.js', './js/ui.js', './js/app.js', './js/vendor/jsQR.js', './js/vendor/qrcode.js', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-180.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))   // descarga fresca, no de la caché HTTP
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    // Petición nueva con la misma URL: una navegación no se puede clonar con opciones distintas
    fetch(new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' }))
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
