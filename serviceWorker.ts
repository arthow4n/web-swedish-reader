/// <reference lib="webworker" />

const sw = self as unknown as ServiceWorkerGlobalScope;

const getCachePathName = (pathFromRoot: string) => {
  return new URL(pathFromRoot, self.location.origin).href;
};

const assetCacheName = "assets";

sw.addEventListener("install", (event: ExtendableEvent) => {
  sw.skipWaiting();

  event.waitUntil(
    caches.open(assetCacheName).then((cache) => {
      cache.addAll([
        getCachePathName("./"),
        getCachePathName("./bookmarklets.html"),
        getCachePathName("./index.html"),
        getCachePathName("./static/js/index.js"),
        getCachePathName("./static/js/async/marked.js"),
        getCachePathName("./static/js/async/dompurify.js"),
        getCachePathName("./static/js/async/turndown.js"),
        getCachePathName("./static/js/async/turndown-plugin-gfm.js"),
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
