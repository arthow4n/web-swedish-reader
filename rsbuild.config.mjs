import { defineConfig } from "@rsbuild/core";
import { pluginTypeCheck } from "@rsbuild/plugin-type-check";

export default defineConfig({
  plugins: [pluginTypeCheck()],
  source: {
    preEntry: ["normalize.css", "sakura.css/css/sakura.css", "./css/index.css"],
    entry: {
      index: "./js/index.ts",
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
    copy: [{ from: "./bookmarklets.html" }],
  },
});
