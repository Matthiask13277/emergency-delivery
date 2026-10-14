const CACHE = "emergency-delivery-mobile-v222";
const APP_SHELL = [
  "/",
  "/index.html",
  "/sync.js",
  "/manifest.json",
  "/service-worker.js",
  "/emergency-delivery-logo.png"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // A missing optional asset must not abort installation of the whole worker.
    await Promise.all(APP_SHELL.map(async path => {
      try {
        const response = await fetch(path, { cache: "reload" });
        if (response.ok && response.type !== "opaque") {
          await cache.put(path, response);
        } else {
          console.warn("Service worker: shell asset not cached", path, response.status);
        }
      } catch (error) {
        console.warn("Service worker: shell asset unavailable", path, String(error));
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never cache API responses, authentication requests, or cross-origin requests.
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(req).then(response => {
      if (response.ok && response.type !== "opaque") {
        const copy = response.clone();
        caches.open(CACHE)
          .then(cache => cache.put(req, copy))
          .catch(error => console.warn("Service worker: cache write failed", String(error)));
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const shell = await caches.match("/");
      if (shell) return shell;
      return new Response("Offline – Ressource nicht verfügbar", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    })
  );
});
