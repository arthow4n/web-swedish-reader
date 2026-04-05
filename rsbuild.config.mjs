import { defineConfig } from "@rsbuild/core";

export default defineConfig({
  source: {
    preEntry: ["normalize.css", "sakura.css/css/sakura.css", "./css/index.css"],
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
