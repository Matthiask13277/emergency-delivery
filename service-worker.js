const CACHE = "emergency-delivery-mobile-v223";
const APP_SHELL = [
  "/",
  "/sync.js",
  "/manifest.json",
  "/service-worker.js",
  "/emergency-delivery-logo.png"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Cache each available shell asset independently; /index.html is intentionally
    // omitted because this hosting setup serves the app at /, not that path.
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

self.addEventListener("push", event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch (_) { payload = { body: event.data ? event.data.text() : "" }; }
  const title = payload.title || "Emergency Delivery";
  const options = {
    body: payload.body || "Es gibt eine neue Information.",
    icon: "/emergency-delivery-logo.png",
    badge: "/emergency-delivery-logo.png",
    data: payload.data || {},
    tag: payload.tag || "emergency-delivery-notification",
    renotify: false
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL("/", self.location.origin).href;
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientsList) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        await client.focus();
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
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
