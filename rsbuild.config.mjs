import { defineConfig } from "@rsbuild/core";
import { pluginTypeCheck } from "@rsbuild/plugin-type-check";

export default defineConfig({
  plugins: [pluginTypeCheck()],
  environments: {
    web: {
      source: {
        preEntry: ["normalize.css", "sakura.css/css/sakura.css", "./css/index.css"],
        entry: {
          index: "./js/index.ts",
        },
      },
      html: {
        template: "./index.html",
      },
      output: {
        assetPrefix: "./",
        filenameHash: false,
        copy: [{ from: "./bookmarklets.html" }],
        distPath: {
            root: "dist"
        }
      },
    },
    worker: {
      source: {
        entry: {
          serviceWorker: "./serviceWorker.ts",
        },
      },
      output: {
        target: "web-worker",
        filenameHash: false,
        distPath: {
            root: "dist",
            worker: "./"
        }
      },
      tools: {
        rspack: {
          output: {
            filename: (pathData) => {
              if (pathData.chunk.name === 'serviceWorker') {
                return 'serviceWorker.js';
              }
              return 'static/js/[name].js';
            }
          }
        }
      }
    }
  },
  server: {
    publicDir: {
      name: "../web-swedish-reader-data",
    },
  },
});
