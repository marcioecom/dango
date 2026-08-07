const CACHE = "dango-shell-v1";
const SHELL = ["/entrar", "/offline", "/icon-192.png", "/icon-512.png", "/icon-maskable.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) {
    return;
  }
  event.respondWith(
    (async () => {
      try {
        return await fetch(event.request);
      } catch {
        if (event.request.mode === "navigate") {
          return (await caches.match("/offline")) ?? Response.error();
        }
        return (await caches.match(event.request)) ?? Response.error();
      }
    })(),
  );
});
