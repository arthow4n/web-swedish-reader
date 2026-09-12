/// <reference lib="webworker" />

const sw = self as unknown as ServiceWorkerGlobalScope;

const getCachePathName = (pathFromRoot: string) => {
  return new URL(pathFromRoot, self.location.origin).href;
};

const assetCacheName = "assets-v2";

sw.addEventListener("install", (event: ExtendableEvent) => {
  sw.skipWaiting();

  event.waitUntil(
    caches.open(assetCacheName).then(async (cache) => {
      const urls = [
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
      ];

      await Promise.all(
        urls.map(async (url) => {
          try {
            await cache.add(url);
          } catch (err) {
            console.warn(`Failed to cache ${url}:`, err);
          }
        }),
      );
    }),
  );
});

sw.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== assetCacheName) {
            return caches.delete(key);
          }
        }),
      ),
    ),
  );
});

sw.addEventListener("fetch", (event: FetchEvent) => {
  // Drop browser extension requests
  if (!event.request.url.startsWith("http")) {
    return;
  }

  if (!navigator.onLine) {
    event.respondWith(caches.match(event.request) as Promise<Response>);
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
        return caches.match(event.request) as Promise<Response>;
      }),
  );
});
