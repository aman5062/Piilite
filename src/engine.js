import { normalize, contextAround, contextBefore } from "./text.js";

/**
 * A pattern is either regex based or finder based:
 *
 *   { type, regex, group?, validator?, context?, requireContext?, lenient?, ... }
 *   { type, find(text) => [{ start, end, confidence? }], ... }
 *
 * - group:          capture group to use as the PII span (needs the `d` flag)
 * - context:        keyword regex looked for around the match; boosts confidence
 * - contextOnly:    'before' to only look before the match
 * - requireContext: drop the match when no context keyword is present
 * - lenient:        accept a failed validator when context is present
 * - region:         span may be trimmed around higher-priority matches
 *
 * The regex/validator/priority/placeholder/severity fields follow the
 * OpenRedaction PIIPattern shape, so those patterns can be passed in as-is.
 */

const DEFAULT_CONFIDENCE = 0.8;

function runPattern(p, norm) {
  const out = [];
  if (p.find) {
    for (const m of p.find(norm)) out.push({ ...m, conf: m.confidence ?? p.confidence ?? DEFAULT_CONFIDENCE });
    return out;
  }
  let re = p.regex;
  const needIndices = p.group != null && !re.hasIndices;
  if (!re.global || needIndices) {
    const flags = new Set(re.flags.split(""));
    flags.add("g");
    if (p.group != null) flags.add("d");
    re = new RegExp(re.source, [...flags].join(""));
  }
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(norm))) {
    if (m[0] === "") {
      re.lastIndex++;
      continue;
    }
    let start = m.index;
    let end = start + m[0].length;
    if (p.group != null) {
      const span = m.indices?.[p.group];
      if (!span) continue;
      [start, end] = span;
    }
    if (end <= start) continue;
    const value = norm.slice(start, end);
    const ctx =
      p.contextOnly === "before"
        ? contextBefore(norm, start, p.contextWindow ?? 40)
        : contextAround(norm, start, end, p.contextWindow ?? 40, p.contextAfter ?? 20);
    const hasContext = p.context ? p.context.test(ctx) : false;
    if (p.requireContext && !hasContext) continue;
    let conf = p.confidence ?? DEFAULT_CONFIDENCE;
    if (p.validator && !p.validator(value, ctx, norm, start, end)) {
      if (!(p.lenient && hasContext)) continue;
      conf = Math.min(conf, 0.7);
    } else if (hasContext) {
      conf = Math.min(1, conf + 0.15);
    }
    out.push({ start, end, conf });
  }
  return out;
}

const TRIM_HEAD = /^[\s,.;:\-–()/]+/;
const TRIM_TAIL = /[\s,;:\-–(/]+$/;

function trimSpan(text, start, end) {
  const s = text.slice(start, end);
  const head = s.match(TRIM_HEAD)?.[0].length ?? 0;
  const tail = s.slice(head).match(TRIM_TAIL)?.[0].length ?? 0;
  return [start + head, end - tail];
}

// Cut [start, end) around already accepted spans and return the leftover pieces
function subtract(start, end, accepted) {
  let pieces = [[start, end]];
  for (const a of accepted) {
    const next = [];
    for (const [s, e] of pieces) {
      if (a.end <= s || a.start >= e) next.push([s, e]);
      else {
        if (a.start > s) next.push([s, a.start]);
        if (a.end < e) next.push([a.end, e]);
      }
    }
    pieces = next;
  }
  return pieces;
}

const overlaps = (a, b) => a.start < b.end && b.start < a.end;

export function findAll(text, patterns, opts) {
  const norm = normalize(text);
  const candidates = [];
  for (const p of patterns) {
    for (const m of runPattern(p, norm)) {
      if (m.conf < opts.minConfidence) continue;
      candidates.push({ p, start: m.start, end: m.end, conf: m.conf });
    }
  }

  candidates.sort(
    (a, b) => (b.p.priority ?? 50) - (a.p.priority ?? 50) || b.end - b.start - (a.end - a.start) || a.start - b.start
  );

  const accepted = [];
  for (const c of candidates) {
    const clash = accepted.some((a) => overlaps(a, c));
    if (!clash) {
      accepted.push(c);
      continue;
    }
    if (!c.p.region) continue;
    for (const [s, e] of subtract(c.start, c.end, accepted)) {
      const [ts, te] = trimSpan(norm, s, e);
      if (/[\p{L}\p{N}]{2}/u.test(norm.slice(ts, te))) accepted.push({ ...c, start: ts, end: te });
    }
  }

  accepted.sort((a, b) => a.start - b.start);
  return accepted.map((a) => ({
    type: a.p.type,
    value: text.slice(a.start, a.end),
    start: a.start,
    end: a.end,
    severity: a.p.severity ?? "medium",
    confidence: Math.round(a.conf * 100) / 100,
    pattern: a.p,
  }));
}
