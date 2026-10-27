// Scores piilite (and OpenRedaction, when installed) on a labelled eval set.
// Run: node eval/run.js [holdout2.json|holdout.json|dataset.json]
//
// recall     share of labelled PII values that end up fully covered by a detection
// precision  share of detections that overlap a labelled PII value
// clean FP   share of PII-free samples where something was (wrongly) redacted
import { readFileSync } from "node:fs";
import { Piilite } from "../src/index.js";

const file = process.argv[2] ?? "holdout2.json";
const data = JSON.parse(readFileSync(new URL(`./${file}`, import.meta.url), "utf8"));
console.log(`# ${file}: ${data.length} samples`);

function score(name, detectFn) {
  const perType = {};
  let tp = 0;
  let fp = 0;
  let cleanHits = 0;
  let cleanTotal = 0;
  let hardFound = 0;
  let hardTotal = 0;

  for (const s of data) {
    const found = detectFn(s.text);
    const covered = (sp) => found.some((d) => d.start <= sp.start && d.end >= sp.end);
    for (const sp of s.spans) {
      const t = (perType[sp.type] ??= { found: 0, total: 0 });
      t.total++;
      if (covered(sp)) t.found++;
      if (sp.hard) {
        hardTotal++;
        if (covered(sp)) hardFound++;
      }
    }
    for (const d of found) {
      if (s.spans.some((sp) => d.start < sp.end && sp.start < d.end)) tp++;
      else fp++;
    }
    if (!s.spans.length) {
      cleanTotal++;
      if (found.length) cleanHits++;
    }
  }

  const all = Object.values(perType).reduce((a, t) => ({ found: a.found + t.found, total: a.total + t.total }), { found: 0, total: 0 });
  const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) + "%" : "-");
  console.log(`\n## ${name}`);
  console.log(`recall ${pct(all.found, all.total)}  precision ${pct(tp, tp + fp)}  clean-text false alarms ${pct(cleanHits, cleanTotal)}`);
  console.log(`names not in any dictionary, no trigger help: ${pct(hardFound, hardTotal)} found`);
  console.log("type".padEnd(16) + "recall");
  for (const [type, t] of Object.entries(perType).sort()) console.log(type.padEnd(16) + pct(t.found, t.total).padStart(7) + `  (${t.found}/${t.total})`);
  return { recall: all.found / all.total, precision: tp / (tp + fp), cleanFP: cleanHits / cleanTotal };
}

const shield = new Piilite();
score("piilite", (t) => shield.scan(t));

try {
  const { LiteOpenRedaction } = await import("@openredaction/core/lite");
  const or = new LiteOpenRedaction();
  const orResults = new Map();
  for (const s of data) {
    const r = await or.detect(s.text);
    orResults.set(s.text, r.detections.map((d) => ({ start: d.position[0], end: d.position[1] })));
  }
  score("OpenRedaction 1.1.5 (lite, defaults)", (t) => orResults.get(t));
} catch (e) {
  if (e.code !== "ERR_MODULE_NOT_FOUND") throw e;
  console.log("\n(OpenRedaction not installed, skipping comparison)");
}
