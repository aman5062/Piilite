// Checks every OpenRedaction pattern on the bridge allowlist against text where
// it must stay silent: clean sentences, Indian PII (outside the labelled value)
// and Indian reference numbers. Prints any type that fires.
// Run: node eval/openredaction-noise.js
import { readFileSync } from "node:fs";
import { Piilite } from "../src/index.js";
import { openRedactionPatterns } from "../src/openredaction.js";

const sets = ["dataset.json", "holdout.json", "holdout2.json"].flatMap((f) =>
  JSON.parse(readFileSync(new URL(`./${f}`, import.meta.url), "utf8"))
);

// Indian reference numbers that are not personal data
let seed = 4242;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const num = (n) => String(Math.floor(rnd() * 9) + 1) + Array.from({ length: n - 1 }, () => Math.floor(rnd() * 10)).join("");
const labels = ["Order ID", "UTR", "UPI Ref No", "Booking ID", "Invoice", "AWB", "Ticket", "Txn ID", "PNR", "Policy No", "Loan No", "Folio"];
const refs = [];
for (let i = 0; i < 600; i++) refs.push({ text: `${labels[i % labels.length]} ${num(8 + (i % 9))} processed on 12/03/2026`, spans: [] });

const only = (types) => new Piilite({ types, customPatterns: openRedactionPatterns({ types }) });
const all = openRedactionPatterns();
const noisy = new Map();
for (const type of new Set(all.map((p) => p.type))) {
  const s = only([type]);
  for (const x of [...sets, ...refs]) {
    for (const d of s.scan(x.text)) {
      if (!x.spans.some((sp) => d.start < sp.end && sp.start < d.end)) {
        noisy.set(type, [...(noisy.get(type) ?? []), `${d.value}  <=  ${x.text.slice(0, 80)}`]);
      }
    }
  }
}

const samples = sets.length + refs.length;
console.log(`checked ${new Set(all.map((p) => p.type)).size} OpenRedaction types on ${samples} samples`);
if (!noisy.size) console.log("no false matches");
for (const [type, hits] of noisy) console.log(`${type}: ${hits.length} false matches, e.g. ${hits[0]}`);
process.exitCode = noisy.size ? 1 : 0;
