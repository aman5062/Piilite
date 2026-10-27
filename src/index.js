import { findAll } from "./engine.js";
import { indiaPatterns } from "./patterns/india.js";
import { globalPatterns } from "./patterns/global.js";
import { secretPatterns } from "./patterns/secrets.js";
import { findNames } from "./finders/names.js";
import { findAddresses } from "./finders/address.js";
import { resolvePreset } from "./presets.js";
import { StreamRedactor, redactAsyncIterable, createTransformStream } from "./stream.js";

const finderPatterns = [
  { type: "NAME", find: findNames, priority: 66, severity: "high", region: true },
  { type: "ADDRESS", find: findAddresses, priority: 67, severity: "high", region: true },
];

export const builtinPatterns = [...secretPatterns, ...indiaPatterns, ...globalPatterns, ...finderPatterns];

export const PII_TYPES = [...new Set(builtinPatterns.map((p) => p.type))];

const DEFAULTS = {
  mode: "placeholder",
  minConfidence: 0.5,
  maskChar: "X",
  keepLast: 4,
  maxInputSize: 5_000_000,
};

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mask(value, type, opts) {
  const ch = opts.maskChar;
  if (opts.mode === "mask-all") return value.replace(/[\p{L}\p{N}]/gu, ch);
  if (type === "EMAIL" && value.includes("@")) {
    const [user, domain] = value.split("@");
    return user[0] + ch.repeat(Math.max(1, user.length - 1)) + "@" + domain;
  }
  const alnum = value.replace(/[^\p{L}\p{N}]/gu, "").length;
  const numeric = /^[\d\s+().\-\/]+$/.test(value);
  // numbers keep their last digits (like banks do); words keep their first letter
  if (numeric || /^(?:PAN|GSTIN|VOTER_ID|PASSPORT_IN|DRIVING_LICENSE|VEHICLE_REG|IFSC|UPI_ID)$/.test(type)) {
    const keep = alnum > opts.keepLast * 2 ? opts.keepLast : Math.floor(alnum / 3);
    let seen = 0;
    return value.replace(/[\p{L}\p{N}]/gu, (c) => (++seen > alnum - keep ? c : ch));
  }
  return value.replace(/(\p{L})(\p{L}*)/gu, (_, first, rest) => first + ch.repeat(rest.length));
}

export class Piilite {
  /**
   * @param {import("../index.d.ts").PiiliteOptions} [options]
   */
  constructor(options = {}) {
    const preset = resolvePreset(options.preset);
    this.options = { ...DEFAULTS, ...preset, ...options };
    const { types, exclude, customPatterns = [] } = this.options;
    let patterns = [...builtinPatterns, ...customPatterns];
    if (types?.length) patterns = patterns.filter((p) => types.includes(p.type));
    if (exclude?.length) patterns = patterns.filter((p) => !exclude.includes(p.type));
    this.patterns = patterns;
    this.allow = (this.options.allow ?? []).map((a) => (a instanceof RegExp ? a : new RegExp(`^${escapeRe(a)}$`, "i")));
  }

  /** Find PII without changing the text. */
  scan(text) {
    if (typeof text !== "string" || !text) return [];
    return findAll(text, this.patterns, this.options)
      .filter((d) => !this.allow.some((re) => re.test(d.value)))
      .map(({ pattern, ...d }) => d);
  }

  /** True when the text contains any PII. */
  hasPII(text) {
    return this.scan(text).length > 0;
  }

  /** Fresh placeholder state; share one across calls to keep numbering consistent. */
  newState() {
    return { counters: {}, seen: new Map(), map: {} };
  }

  /** Replace already-found matches in `text`. Used by detect() and the stream API. */
  apply(text, found, state = this.newState()) {
    const opts = this.options;
    let out = "";
    let last = 0;
    const detections = [];

    for (const d of found) {
      const key = d.type + "\u0000" + d.value.toLowerCase();
      let placeholder = state.seen.get(key);
      if (placeholder === undefined) {
        if (typeof opts.mode === "function") placeholder = opts.mode(d);
        else if (opts.mode === "placeholder") {
          state.counters[d.type] = (state.counters[d.type] ?? 0) + 1;
          placeholder = opts.placeholder
            ? opts.placeholder(d.type, state.counters[d.type], d.value)
            : `[${d.type}_${state.counters[d.type]}]`;
        } else if (opts.mode === "remove") placeholder = "";
        else placeholder = mask(d.value, d.type, opts);
        state.seen.set(key, placeholder);
        if (placeholder) state.map[placeholder] = d.value;
      }
      out += text.slice(last, d.start) + placeholder;
      last = d.end;
      detections.push({
        type: d.type,
        value: d.value,
        placeholder,
        position: [d.start, d.end],
        severity: d.severity,
        confidence: d.confidence,
      });
    }
    out += text.slice(last);
    return { redacted: out, detections };
  }

  /**
   * Detect and redact PII. Returns the same shape as OpenRedaction's detect(),
   * so `await shield.detect(text)` works for both libraries.
   */
  detect(text, state = this.newState()) {
    const t0 = Date.now();
    const input = typeof text === "string" ? text : "";
    const { redacted, detections } = this.apply(input, this.scan(input), state);
    const byType = {};
    for (const d of detections) byType[d.type] = (byType[d.type] ?? 0) + 1;
    const result = {
      original: input,
      redacted,
      detections,
      redactionMap: state.map,
      stats: { piiCount: detections.length, processingTime: Date.now() - t0, byType },
    };
    // audit hook: receives types, counts and positions, never needs the raw text
    this.options.onDetect?.(result);
    return result;
  }

  /** Shortcut that returns only the redacted string. */
  redact(text) {
    return this.detect(text).redacted;
  }

  /**
   * Redact every string inside an object or array (e.g. a chat payload or a
   * tool result). Placeholders are shared across all strings, so the same
   * value always gets the same placeholder. `skipKeys` leaves fields as-is.
   */
  redactObject(value, { skipKeys = [] } = {}) {
    const state = this.newState();
    const skip = new Set(skipKeys);
    const walk = (v) => {
      if (typeof v === "string") return this.detect(v, state).redacted;
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === "object" && !(v instanceof Date)) {
        return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, skip.has(k) ? x : walk(x)]));
      }
      return v;
    };
    return { value: walk(value), redactionMap: state.map };
  }

  /** Put the original values back, e.g. into an LLM answer. */
  restore(text, redactionMap, options) {
    return restore(text, redactionMap, options);
  }

  /** Streaming redactor: push(chunk) → safe text, end() → the rest. */
  createStream(options) {
    return new StreamRedactor(this, options);
  }

  /** Redact an async iterable of text chunks (LLM token streams). */
  redactStream(source, options) {
    return redactAsyncIterable(this, source, options);
  }

  /** Web Streams TransformStream that redacts text passing through. */
  transformStream(options) {
    return createTransformStream(this, options);
  }

  // OpenRedaction compatibility, so its JSON / CSV / XLSX / streaming processors accept piilite
  getPatterns() {
    return this.patterns;
  }

  getCacheStats() {
    return { size: 0, maxSize: 0, enabled: false };
  }
}

/**
 * Replace placeholders with their original values. With `fuzzy` (default) it
 * also understands how models tend to rewrite them: "[NAME 1]", "[name_1]",
 * "NAME_1", "[ NAME-1 ]".
 */
export function restore(text, redactionMap, { fuzzy = true } = {}) {
  const keys = Object.keys(redactionMap ?? {}).sort((a, b) => b.length - a.length);
  if (!keys.length || typeof text !== "string") return text;
  let out = text.replace(new RegExp(keys.map(escapeRe).join("|"), "g"), (k) => redactionMap[k]);
  if (!fuzzy) return out;

  const canonical = new Map();
  for (const k of keys) {
    const m = k.match(/^\[([A-Z][A-Z0-9_]*?)_(\d+)\]$/);
    if (m) canonical.set(`${m[1]}_${m[2]}`, redactionMap[k]);
  }
  if (!canonical.size) return out;
  return out.replace(/\[\s*([A-Za-z][A-Za-z0-9_]*?)[\s_-]+(\d+)\s*\]|\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*?)_(\d+)\b/g, (whole, a, b, c, d) => {
    const key = `${(a ?? c).toUpperCase().replace(/[\s-]+/g, "_")}_${b ?? d}`;
    return canonical.get(key) ?? whole;
  });
}

let shared;
const defaultInstance = () => (shared ??= new Piilite());

/** Redact with default options. */
export const redact = (text) => defaultInstance().redact(text);
/** Scan with default options. */
export const scan = (text) => defaultInstance().scan(text);
/** Detect with default options. */
export const detect = (text) => defaultInstance().detect(text);
/** True when text contains PII (default options). */
export const hasPII = (text) => defaultInstance().hasPII(text);

export { presets } from "./presets.js";
export { StreamRedactor } from "./stream.js";
export { verhoeff, verhoeffDigit, luhn, aadhaar, pan, gstin, gstinChecksum } from "./validators.js";

export default Piilite;
