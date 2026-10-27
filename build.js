// Builds CommonJS copies of every entry point into dist/ (ESM source is used as-is).
// Run: npm run build
import { build } from "esbuild";

const entries = {
  index: "src/index.js",
  openredaction: "src/openredaction.js",
  express: "src/express.js",
  react: "src/react.js",
};

for (const [name, entry] of Object.entries(entries)) {
  await build({
    entryPoints: [entry],
    outfile: `dist/${name}.cjs`,
    bundle: true,
    format: "cjs",
    platform: "neutral",
    target: "node18",
    external: ["@openredaction/core", "react"],
    // subpath bundles reuse the main CJS build so there is one Piilite class
    plugins: name === "index" ? [] : [{
      name: "share-core",
      setup(b) {
        b.onResolve({ filter: /^\.\/index\.js$/ }, () => ({ path: "./index.cjs", external: true }));
      },
    }],
    legalComments: "none",
    logLevel: "warning",
  });
}

// minified ESM bundle, only to report the size
const { outputFiles } = await build({ entryPoints: ["src/index.js"], bundle: true, minify: true, format: "esm", write: false, platform: "neutral" });
const { gzipSync } = await import("node:zlib");
const code = outputFiles[0].contents;
console.log(`core: ${(code.length / 1024).toFixed(1)} KB minified, ${(gzipSync(code).length / 1024).toFixed(1)} KB gzipped`);
