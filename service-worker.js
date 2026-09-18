/* Service Worker — Nuestras Finanzas */
const CACHE_NAME = 'nf-v17-' + Date.now();
const PRECACHE = ['./', './index.html', './manifest.json', './css/styles.css', './js/app.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Borrar TODOS los caches viejos, no solo el CACHE_NAME anterior
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Network-first para CSS y JS (siempre la versión más fresca)
  if (url.pathname.endsWith('.css') || url.pathname.endsWith('.js')) {
    event.respondWith(
      fetch(event.request).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return res;
      }).catch(() => caches.match(event.request))
    );
    return;
  }
  // Cache-first para el resto
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

/* ===== Push notifications ===== */
self.addEventListener('push', (event) => {
  let payload = { title: 'Nuestras Finanzas', body: 'Tienes un recordatorio.', url: './' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (e) {}

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: './assets/icons/icon-192.png',
      badge: './assets/icons/icon-192.png',
      data: { url: payload.url || './' },
      tag: payload.tag || 'nf-reminder',
      requireInteraction: false,
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
