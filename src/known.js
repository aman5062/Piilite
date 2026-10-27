// Values already found in a text or session are masked wherever they appear
// again, even where nothing around them would trigger a rule: "what did rahul
// approve" after "Approved by Rahul Sharma" maps "rahul" to the same placeholder.
import { NOT_NAME } from "./data/names.js";

// Parts of a name that are too common to stand for one person on their own
const GENERIC_PARTS = new Set(
  "kumar singh kaur devi lal ram bai ben bhai md mohd mohammad muhammad mohammed sri shri smt kumari begum khan sheikh shaikh syed".split(" ")
);

/**
 * Key that decides which values share a placeholder. Case and spacing are
 * ignored unless `matchCase` is set; phone numbers compare on their last 10
 * digits, IDs on their letters and digits only.
 */
export function valueKey(type, value, matchCase) {
  if (matchCase) return value;
  if (type === "PHONE_IN") {
    const d = value.replace(/\D/g, "");
    if (d.length >= 10) return d.slice(-10);
  }
  if (/\d/.test(value) && !/\p{L}{3,}[\s,]+\p{L}{2,}/u.test(value)) return value.replace(/[\s.\-\/()]/g, "").toUpperCase();
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Remember what was found, so later text can be matched against it. */
export function learn(found, known) {
  for (const d of found) {
    const full = d.value.toLowerCase().replace(/\s+/g, " ").trim();
    if (full.length >= 3 && !known.has(full)) known.set(full, { type: d.type, alias: d.alias ?? d.value, severity: d.severity });
    if (d.type !== "NAME") continue;
    for (const part of full.split(/[\s.]+/)) {
      if (part.length < 3 || !/^\p{L}+$/u.test(part) || NOT_NAME.has(part) || GENERIC_PARTS.has(part) || known.has(part)) continue;
      known.set(part, { type: "NAME", alias: d.alias ?? d.value, severity: d.severity, part: true });
    }
  }
}

const cache = new WeakMap();

function knownRegex(known) {
  const hit = cache.get(known);
  if (hit && hit.size === known.size) return hit.re;
  const alts = [...known.keys()]
    .sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+"));
  const re = alts.length ? new RegExp(`(?<![\\p{L}\\p{N}_@.])(?:${alts.join("|")})(?![\\p{L}\\p{N}_@])`, "giu") : null;
  cache.set(known, { size: known.size, re });
  return re;
}

/** Occurrences of known values in `text` that `found` does not already cover. */
export function matchKnown(text, known, found) {
  const re = knownRegex(known);
  if (!re) return [];
  const out = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(text))) {
    const start = m.index;
    const end = start + m[0].length;
    if (found.some((d) => d.start < end && start < d.end)) continue;
    const k = known.get(m[0].toLowerCase().replace(/\s+/g, " "));
    if (!k) continue;
    out.push({ type: k.type, value: m[0], alias: k.alias, start, end, severity: k.severity ?? "high", confidence: k.part ? 0.75 : 0.9 });
  }
  return out;
}
