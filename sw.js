// ─── Jini24 Service Worker ───────────────────────────────────
const CACHE_NAME = "jini24-v8";
const OFFLINE_URL = "/index.html";

// Assets to pre-cache on install
const PRE_CACHE = [
  "/",
  "/index.html",
  "/css/styles.css?v=8",
  "/js/api.js?v=4",
  "/js/app.js?v=4",
  "/js/admin.js?v=4",
  "/js/customer.js?v=5",
  "/js/partner.js?v=4",
  "/logo.png",
  "/manifest.json"
];

// Install — cache shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRE_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
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

// Fetch — network-first for HTML/CSS/JS, cache-first for images
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip Google APIs / external scripts (don't cache)
  if (
    url.origin.includes("googleapis.com") ||
    url.origin.includes("google.com") ||
    url.origin.includes("gstatic.com") ||
    url.origin.includes("script.google.com") ||
    url.origin.includes("imgbb.com") ||
    url.origin.includes("unpkg.com") ||
    url.origin.includes("cdn.jsdelivr.net")
  ) {
    return;
  }

  // For same-origin requests
  if (url.origin === self.location.origin) {
    const isCodeFile = url.pathname.endsWith(".html") ||
                       url.pathname.endsWith(".css") ||
                       url.pathname.endsWith(".js") ||
                       url.pathname === "/";

    if (isCodeFile) {
      // Network-first for code files — always get the latest
      event.respondWith(
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => {
            return caches.match(event.request) || caches.match(OFFLINE_URL);
          })
      );
    } else {
      // Cache-first for static assets (images, fonts, etc.)
      event.respondWith(
        caches.open(CACHE_NAME).then((cache) =>
          cache.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  cache.put(event.request, networkResponse.clone());
                }
                return networkResponse;
              })
              .catch(() => cachedResponse || caches.match(OFFLINE_URL));

            return cachedResponse || fetchPromise;
          })
        )
      );
    }
  }
});
