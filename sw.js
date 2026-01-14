const CACHE_NAME = "hongilin-pwa-v1";
const CORE_ASSETS = ["/", "/index.html", "/manifest.json", "/LOGO.jpg"];
const IS_LOCALHOST =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1";

if (IS_LOCALHOST) {
  self.addEventListener("install", (event) => {
    event.waitUntil(self.skipWaiting());
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      self.registration.unregister().then(() =>
        self.clients.matchAll({ type: "window" }).then((clients) => {
          clients.forEach((client) => client.navigate(client.url));
        })
      )
    );
  });

  self.addEventListener("fetch", (event) => {
    event.respondWith(fetch(event.request));
  });
} else {
  self.addEventListener("install", (event) => {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then((cache) => cache.addAll(CORE_ASSETS))
        .then(() => self.skipWaiting())
    );
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((keys) =>
          Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
        )
        .then(() => self.clients.claim())
    );
  });

  self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
      self.skipWaiting();
    }
  });

  self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth")) {
      event.respondWith(fetch(req));
      return;
    }

    if (req.mode === "navigate") {
      event.respondWith(
        fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", copy));
            return res;
          })
          .catch(() => caches.match("/index.html"))
      );
      return;
    }

    event.respondWith(
      caches.match(req).then((cached) =>
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
      )
    );
  });
}
