// Builds the docs website into docs/ (served by GitHub Pages from main /docs).
// Run: npm run site
import { mkdirSync, writeFileSync, readFileSync, copyFileSync, readdirSync, rmSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import { Piilite, redact, aadhaar, pan, gstin, PII_TYPES } from "../src/index.js";
import { render, SITE, REPO, NPM, esc } from "./layout.mjs";
import { pages, ACCURACY } from "./pages.mjs";

const OUT = new URL("../docs/", import.meta.url);
const ASSETS = new URL("./assets/", import.meta.url);
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

// every output the site shows, checked against the real library
const EXAMPLES = [
  [() => new Piilite().redact("Myself Ankit Kumar Gupta, call 9123456780 or pay ankit@okhdfcbank. PAN ABCPS1234K, OTP is 482913"),
    "Myself [NAME_1], call [PHONE_IN_1] or pay [UPI_ID_1]. PAN [PAN_1], OTP is [OTP_1]"],
  [() => new Piilite({ mode: "mask" }).redact("call 9123456780"), "call XXXXXX6780"],
  [() => new Piilite({ mode: "mask" }).redact("PAN ABCPS1234K"), "PAN XXXXXX234K"],
  [() => new Piilite({ mode: "mask" }).redact("rahul@gmail.com"), "rXXXX@gmail.com"],
  [() => new Piilite({ mode: "mask-all", maskChar: "*" }).redact("call 9123456780"), "call **********"],
  [() => new Piilite({ mode: "remove" }).redact("call 9123456780 now"), "call  now"],
  [() => new Piilite({ mode: (m) => `<${m.type}>` }).redact("call 9123456780"), "call <PHONE_IN>"],
  [() => new Piilite({ customPatterns: [{ type: "EMPLOYEE_ID", regex: /\bEMP-\d{5}\b/g, priority: 90, severity: "medium" }] }).redact("id EMP-00421"), "id [EMPLOYEE_ID_1]"],
  [() => redact("call 9123456780"), "call [PHONE_IN_1]"],
  [() => new Piilite({ types: ["AADHAAR"] }).scan("Aadhaar: 4918 3726 5017").map((d) => d.value).join(), "4918 3726 5017"],
  [() => new Piilite({ types: ["AADHAAR"] }).scan("UTR 412398765432 credited").length, 0],
  [() => aadhaar("491837265017"), true],
  [() => pan("ABCPS1234K"), true],
  [() => pan("ABCXS1234K"), false],
  [() => gstin("27AAPFU0939F1ZV"), true],
  [() => redact("pay rahul.k@okhdfcbank or 9123456780@ybl"), "pay [UPI_ID_1] or [UPI_ID_2]"],
  [() => redact("my SBI A/c 50100234567890, IFSC SBIN0004512"), "my SBI A/c [BANK_ACCOUNT_1], IFSC [IFSC_1]"],
  [() => redact("Address: Flat no 302, Sai Krupa Apartment, MG Road, Pune - 411001. Phone 9123456780"), "Address: [ADDRESS_1]. Phone [PHONE_IN_1]"],
  [() => new Piilite({ include: ["LOCATION"] }).redact("Based in: Kotputli, Rajasthan"), "Based in: [LOCATION_1]"],
  [() => new Piilite().restore("Hi [NAME 1], calling [phone_in_1]", { "[NAME_1]": "Rahul Sharma", "[PHONE_IN_1]": "9123456780" }), "Hi Rahul Sharma, calling 9123456780"],
];
let failed = 0;
for (const [fn, expected] of EXAMPLES) {
  const got = fn();
  if (got !== expected) {
    failed++;
    console.error(`example mismatch:\n  expected ${JSON.stringify(expected)}\n  got      ${JSON.stringify(got)}`);
  }
}
if (failed) process.exit(1);

// browser bundle for the playground (and to measure the real size)
const bundle = await build({ entryPoints: ["src/index.js"], bundle: true, minify: true, format: "esm", platform: "neutral", write: false, legalComments: "none" });
const js = bundle.outputFiles[0].contents;
const gzipKB = (gzipSync(js).length / 1024).toFixed(1);

const result = new Piilite().detect("Myself Ankit Kumar Gupta, call 9123456780 or pay ankit@okhdfcbank.");
const exampleResult = `{
  original: ${JSON.stringify(result.original)},
  redacted: ${JSON.stringify(result.redacted)},
  detections: [
${result.detections.map((d) => `    ${JSON.stringify(d).replace(/"(\w+)":/g, "$1: ").replace(/,(?=\w+: )/g, ", ")},`).join("\n")}
  ],
  redactionMap: ${JSON.stringify(result.redactionMap).replace(/":"/g, '": "').replace(/","/g, '", "')},
  stats: { piiCount: ${result.stats.piiCount}, byType: ${JSON.stringify(result.stats.byType).replace(/"(\w+)":/g, "$1: ")}, processingTime: 1 },
}`;

const now = new Date();
const ctx = {
  version: pkg.version,
  gzipKB,
  today: now.toISOString().slice(0, 10),
  todayHuman: now.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
  tagline: "Lightweight, zero-dependency, India-first PII detection and masking for JavaScript.",
  exampleResult,
  features: [
    "Aadhaar detection with Verhoeff checksum",
    "PAN and GSTIN validation",
    "UPI ID, bank account and IFSC detection",
    "Indian mobile and landline numbers in every format",
    "Indian names and addresses, Hinglish and 10 Indian languages",
    "OTP, password and API key redaction",
    "Placeholder, mask and remove modes",
    "Restore original values in LLM answers",
    "Streaming redaction for LLM token streams",
    "DPDP Act 2023, KYC, GDPR, HIPAA and PCI presets",
    "Express middleware and React hooks",
    "Optional OpenRedaction bridge for 110 global ID types",
  ],
  keywords: ["pii detection", "pii redaction", "data masking", "aadhaar", "pan", "gstin", "upi", "dpdp act", "javascript", "typescript", "npm", "llm privacy", "india", "openredaction alternative"],
};

// output
if (existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(new URL("assets/", OUT), { recursive: true });
for (const f of readdirSync(ASSETS)) copyFileSync(new URL(f, ASSETS), new URL(`assets/${f}`, OUT));
writeFileSync(new URL("assets/piilite.min.js", OUT), js);

for (const page of pages) {
  const dir = new URL(page.path, OUT);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL("index.html", dir), render(page, ctx));
}

writeFileSync(
  new URL("404.html", OUT),
  `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page not found · piilite</title><meta name="robots" content="noindex"><link rel="icon" href="${SITE}assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${SITE}assets/site.css"></head><body><main id="main"><h1>Page not found</h1><p class="lead">This page does not exist. Try the <a href="${SITE}">home page</a>, the <a href="${SITE}guide/">guide</a> or the <a href="${SITE}faq/">FAQ</a>.</p></main></body></html>\n`
);

writeFileSync(
  new URL("sitemap.xml", OUT),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${SITE}${p.path}</loc><lastmod>${ctx.today}</lastmod><changefreq>${p.path ? "monthly" : "weekly"}</changefreq><priority>${p.path ? "0.8" : "1.0"}</priority></url>`).join("\n")}
</urlset>
`
);

// search and AI crawlers are all welcome
const BOTS = ["Googlebot", "Bingbot", "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot", "Applebot-Extended", "DuckDuckBot", "CCBot", "meta-externalagent"];
writeFileSync(
  new URL("robots.txt", OUT),
  `# piilite docs: open to search engines and AI assistants
User-agent: *
Allow: /

${BOTS.map((b) => `User-agent: ${b}\nAllow: /`).join("\n\n")}

Sitemap: ${SITE}sitemap.xml
`
);

// llms.txt (https://llmstxt.org): a short map of the docs for AI assistants
writeFileSync(
  new URL("llms.txt", OUT),
  `# piilite

> piilite is a lightweight (${gzipKB} KB gzipped), zero-dependency JavaScript library for India-first PII detection and masking. It detects Aadhaar (Verhoeff checksum), PAN, GSTIN (mod-36 checksum), UPI IDs, +91 phone numbers, bank accounts, voter IDs, vehicle numbers, Indian names and addresses (Hinglish and 10 Indian languages), OTPs and API keys, and is built for apps that send user text to LLMs. MIT licensed. Install: \`npm install piilite\`. Current version: ${pkg.version}.

Key facts:
- Usage: \`import { Piilite } from "piilite"; new Piilite().detect(text)\` returns \`{ redacted, detections, redactionMap }\`; \`restore(answer, redactionMap)\` puts values back.
- Runs locally in Node.js 18+, browsers, Bun and Deno; no AI model and no network calls.
- Held-out benchmark (${ACCURACY.samples} samples): ${ACCURACY.piilite.recall}% recall and ${ACCURACY.piilite.precision}% precision, vs ${ACCURACY.openredaction.recall}% and ${ACCURACY.openredaction.precision}% for OpenRedaction 1.1.5.
- Presets: dpdp (India's DPDP Act 2023), kyc, fintech, pci, healthcare, hr, secrets, gdpr, hipaa.
- Detected types: ${PII_TYPES.join(", ")}.

## Docs

- [Guide](${SITE}guide/): install, detect, masking modes, options, API, custom patterns, browser use
- [Indian PII](${SITE}india-pii/): Aadhaar, PAN, GSTIN, UPI, phone formats, bank accounts, names, addresses
- [LLM apps](${SITE}llm/): redact prompts, restore answers, streaming, chat payloads, Express, React
- [Presets](${SITE}presets/): DPDP, KYC, fintech, PCI, healthcare, HR, GDPR, HIPAA
- [Accuracy](${SITE}accuracy/): benchmark method and per-type results
- [FAQ](${SITE}faq/): common questions

## Comparisons

- [piilite vs OpenRedaction](${SITE}openredaction/): accuracy, features, migration and the optional bridge

## Optional

- [Full documentation as Markdown](${SITE}llms-full.txt)
- [Source code](${REPO})
- [npm package](${NPM})
`
);
writeFileSync(new URL("llms-full.txt", OUT), readFileSync(new URL("../README.md", import.meta.url), "utf8"));
writeFileSync(new URL(".nojekyll", OUT), "");

console.log(`site: ${pages.length} pages + 404, sitemap, robots, llms.txt · bundle ${gzipKB} KB gzipped · ${EXAMPLES.length} examples verified`);
