const getCachePathName = (pathFromRoot) => {
  return import.meta.resolve(pathFromRoot);
};

const assetCacheName = "assets";

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(assetCacheName).then((cache) => {
      cache.addAll([
        getCachePathName("./"),
        getCachePathName("./bookmarklets.html"),
        getCachePathName("./index.html"),
        getCachePathName("./static/js/index.js"),
        getCachePathName("./static/css/index.css"),
        getCachePathName(
          "../web-swedish-reader-data/folkets-compound/folkets-compound.chunk.001.mjs",
        ),
        getCachePathName(
          "../web-swedish-reader-data/folkets-compound/folkets-compound.meta.mjs",
        ),
        getCachePathName(
          "../web-swedish-reader-data/folkets-sven/folkets-sven.chunk.001.mjs",
        ),
        getCachePathName(
          "../web-swedish-reader-data/folkets-sven/folkets-sven.meta.mjs",
        ),
      ]);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  // Drop browser extension requests
  if (!event.request.url.startsWith("http")) {
    return;
  }

  if (!navigator.onLine) {
    event.respondWith(caches.match(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches
            .open(assetCacheName)
            .then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      }),
  );
});
