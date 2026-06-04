const CACHE_NAME = 'dayera-chat-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).catch(() => {
    return new Response('انت أوفلاين دلوقتي', {
      headers: {'Content-Type': 'text/html; charset=utf-8'}
    });
  }));
});