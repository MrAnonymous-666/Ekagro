const CACHE_NAME = "ekagro-cache-v3";
const ASSETS_TO_CACHE = [
  "./index.html", "./app-core.js", "./app-panels-theme.js", "./app-tasks.js",
  "./app-settings.js", "./app-reports.js", "./app-notes.js", "./app-init.js",
  "./config.js", "./storage.js", "./manifest.json", "./icon-192.png", "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
  self.clients.claim();
});
// Network-first for the app shell (html/js/css) so a new deploy is picked up
// immediately; falls back to the cached copy only when offline. API calls
// are always left untouched.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api")) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
