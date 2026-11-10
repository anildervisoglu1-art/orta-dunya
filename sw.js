/* Orta Dünya Müzayedesi: ana ekran uygulaması için hizmet çalışanı.
 * - Sayfa (gezinme): önce ağ; ağ yoksa son kaydedilen sayfa (çevrimdışı da açılır, yeni sürüm hemen gelir).
 * - assets/ altındaki dosyalar (adları içerikle değişir): önce önbellek.
 * - Diğer aynı kökenli dosyalar (simge, manifest): önbellekten ver, arkada tazele.
 * Başka kökenlere (çevrim içi eşleşme sunucusu vb.) hiç dokunmaz. */
const ONBELLEK = 'orta-dunya-1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(ONBELLEK).then((c) => c.addAll(['./', './manifest.webmanifest'])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith('orta-dunya-') && k !== ONBELLEK).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const kopya = res.clone();
            caches.open(ONBELLEK).then((c) => c.put('./', kopya));
          }
          return res;
        })
        .catch(() => caches.match('./').then((r) => r || Response.error())),
    );
    return;
  }

  if (url.pathname.includes('/assets/')) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const kopya = res.clone();
              caches.open(ONBELLEK).then((c) => c.put(req, kopya));
            }
            return res;
          }),
      ),
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => {
      const ag = fetch(req)
        .then((res) => {
          if (res.ok) {
            const kopya = res.clone();
            caches.open(ONBELLEK).then((c) => c.put(req, kopya));
          }
          return res;
        })
        .catch(() => hit || Response.error());
      return hit || ag;
    }),
  );
});
