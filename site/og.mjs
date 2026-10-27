// Renders site/og.svg and the favicon to PNG. Only needed when the artwork changes:
//   apk add font-dejavu && npm i --no-save @resvg/resvg-js && node site/og.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const png = (svg, opts) => new Resvg(svg, { font: { loadSystemFonts: true, defaultFontFamily: "DejaVu Sans" }, ...opts }).render().asPng();
writeFileSync("site/assets/og.png", png(readFileSync("site/og.svg", "utf8")));
writeFileSync("site/assets/apple-touch-icon.png", png(readFileSync("site/assets/favicon.svg", "utf8"), { fitTo: { mode: "width", value: 180 } }));
console.log("wrote site/assets/og.png and apple-touch-icon.png");
