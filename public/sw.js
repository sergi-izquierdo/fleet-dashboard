const CACHE_NAME = "fleet-dashboard-v1";

const APP_SHELL_URLS = [
  "/",
  "/offline",
];

// Install: pre-cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_URLS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for everything, cache fallback for navigation only
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET requests (POST, PUT, etc.) — Cache API does not support them
  if (request.method !== "GET") {
    return;
  }

  // Skip non-HTTP(S) schemes (e.g. chrome-extension://) — they cannot be cached
  if (!request.url.startsWith("http")) {
    return;
  }

  // Never cache API requests — they must always be fresh
  if (request.url.includes("/api/")) {
    return;
  }

  // For navigation requests (HTML pages): network-first, fall back to cache, then offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses for offline use
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("/offline"))
        )
    );
    return;
  }

  // For static assets (JS, CSS, images): stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
