/* Loom & Pastel Co. — Service Worker */
const CACHE = "lp-cache-v1";
const OFFLINE_URLS = ["/", "/offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(OFFLINE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // API: network-first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(req).then((r) => { const clone = r.clone(); caches.open(CACHE).then((c) => c.put(req, clone)); return r; }).catch(() => caches.match(req))
    );
    return;
  }
  // Static: cache-first with network fallback
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((r) => {
      const clone = r.clone();
      caches.open(CACHE).then((c) => c.put(req, clone));
      return r;
    }).catch(() => caches.match("/offline.html")))
  );
});
