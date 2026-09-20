// Service Worker - Auto-purging and unregistering old caches
self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys.map((k) => caches.delete(k)));
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    // Always fetch fresh from network
    e.respondWith(fetch(e.request));
});
