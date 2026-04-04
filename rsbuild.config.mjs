import { defineConfig } from "@rsbuild/core";

export default defineConfig({
  source: {
    entry: {
      index: "./js/index.mjs",
    },
  },
  html: {
    template: "./index.html",
  },
  server: {
    publicDir: {
      name: "../web-swedish-reader-data",
    },
  },
  output: {
    assetPrefix: "./",
    filenameHash: false,
    copy: [{ from: "./bookmarklets.html" }, { from: "./serviceWorker.mjs" }],
  },
});
