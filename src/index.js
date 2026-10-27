import { findAll } from "./engine.js";
import { indiaPatterns } from "./patterns/india.js";
import { globalPatterns } from "./patterns/global.js";
import { secretPatterns } from "./patterns/secrets.js";
import { findNames } from "./finders/names.js";
import { findAddresses } from "./finders/address.js";
import { resolvePreset } from "./presets.js";
import { StreamRedactor, redactAsyncIterable, createTransformStream, RestoreStream, restoreAsyncIterable } from "./stream.js";
import { valueKey, learn, matchKnown } from "./known.js";

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
    const { types, exclude, include = [], customPatterns = [] } = this.options;
    let patterns = [...builtinPatterns, ...customPatterns];
    // opt-in types (LOCATION) only run when named in `types` or `include`
    patterns = patterns.filter((p) => !p.optIn || include.includes(p.type) || types?.includes(p.type));
    if (types?.length) patterns = patterns.filter((p) => types.includes(p.type) || include.includes(p.type));
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
    return { counters: {}, seen: new Map(), map: {}, known: new Map() };
  }

  /**
   * Matches in `text`: what the rules find, plus every value this state has seen
   * before (or that appears elsewhere in the same text), even without a clue.
   */
  find(text, state = this.newState(), scanned) {
    const found = scanned ?? this.scan(text);
    state.known ??= new Map();
    learn(found, state.known);
    if (this.options.propagate === false) return found;
    const extra = matchKnown(text, state.known, found);
    return extra.length ? [...found, ...extra].sort((a, b) => a.start - b.start) : found;
  }

  /** Replace already-found matches in `text`. Used by detect() and the stream API. */
  apply(text, found, state = this.newState()) {
    const opts = this.options;
    let out = "";
    let last = 0;
    const detections = [];

    for (const d of found) {
      // "Rahul Sharma", "rahul sharma" and a later bare "rahul" share one placeholder
      // (matchCase: true keeps each spelling apart); `alias` is the full value a part belongs to
      const original = d.alias ?? d.value;
      const key = d.type + "\u0000" + valueKey(d.type, original, opts.matchCase);
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
        if (placeholder) state.map[placeholder] = original;
      } else if (placeholder && /\p{Lu}/u.test(original) && state.map[placeholder] === state.map[placeholder].toLowerCase()) {
        // restore the best spelling seen: "Rahul Sharma" from a document over "rahul sharma" from the question
        state.map[placeholder] = original;
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
  detect(text, state = this.newState(), scanned) {
    const t0 = Date.now();
    const input = typeof text === "string" ? text : "";
    const { redacted, detections } = this.apply(input, this.find(input, state, scanned), state);
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
   * Detect in several texts with one set of placeholders. Every text is scanned
   * first, so a name found in a document is also masked in a question that only
   * says "rahul" (RAG: pass the question, the passages and the history together).
   */
  detectAll(texts, state = this.newState()) {
    const inputs = texts.map((t) => (typeof t === "string" ? t : ""));
    const scans = inputs.map((t) => this.scan(t));
    state.known ??= new Map();
    for (const found of scans) learn(found, state.known);
    return inputs.map((t, i) => this.detect(t, state, scans[i]));
  }

  /** detectAll() that returns only the redacted strings. */
  redactAll(texts, state) {
    return this.detectAll(texts, state).map((r) => r.redacted);
  }

  /**
   * Redact every string inside an object or array (e.g. a chat payload or a
   * tool result). All strings are scanned first and share placeholders, so the
   * same value always gets the same placeholder. `skipKeys` leaves fields as-is.
   */
  redactObject(value, { skipKeys = [], state = this.newState() } = {}) {
    const skip = new Set(skipKeys);
    const strings = [];
    const collect = (v) => {
      if (typeof v === "string") strings.push(v);
      else if (Array.isArray(v)) v.forEach(collect);
      else if (v && typeof v === "object" && !(v instanceof Date)) for (const [k, x] of Object.entries(v)) if (!skip.has(k)) collect(x);
    };
    collect(value);
    const redacted = this.redactAll(strings, state);
    let i = 0;
    const rebuild = (v) => {
      if (typeof v === "string") return redacted[i++];
      if (Array.isArray(v)) return v.map(rebuild);
      if (v && typeof v === "object" && !(v instanceof Date)) {
        return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, skip.has(k) ? x : rebuild(x)]));
      }
      return v;
    };
    return { value: rebuild(value), redactionMap: state.map };
  }

  /**
   * A session keeps one set of placeholders across many calls: mask the
   * question, the passages and the history, then restore the answer (also as a
   * stream) with the same map.
   */
  session() {
    const state = this.newState();
    const self = this;
    return {
      state,
      get redactionMap() {
        return state.map;
      },
      detect: (text) => self.detect(text, state),
      redact: (text) => self.detect(text, state).redacted,
      detectAll: (texts) => self.detectAll(texts, state),
      redactAll: (texts) => self.redactAll(texts, state),
      redactObject: (value, options) => self.redactObject(value, { ...options, state }),
      restore: (text, options) => restore(text, state.map, options),
      createRestoreStream: (options) => new RestoreStream(state.map, options),
      restoreStream: (source, options) => restoreAsyncIterable(state.map, source, options),
      createStream: (options) => new StreamRedactor(self, { ...options, state }),
    };
  }

  /** Put the original values back, e.g. into an LLM answer. */
  restore(text, redactionMap, options) {
    return restore(text, redactionMap, options);
  }

  /** Restore placeholders in a stream of model output, never emitting half a placeholder. */
  createRestoreStream(redactionMap, options) {
    return new RestoreStream(redactionMap, options);
  }

  /** restore() over an async iterable of text chunks. */
  restoreStream(source, redactionMap, options) {
    return restoreAsyncIterable(redactionMap, source, options);
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
 * Replace placeholders with their original values. With `fuzzy` (default true)
 * it also understands how models rewrite them: "[NAME 1]", "[name_1]",
 * "[ NAME-1 ]" and the bare "NAME_1". `fuzzy: "brackets"` restores only
 * bracketed forms, for text that may contain words like EMAIL_1 on purpose.
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
  const re = fuzzy === "brackets" ? FUZZY_BRACKETS : FUZZY_ALL;
  re.lastIndex = 0;
  return out.replace(re, (whole, a, b, c, d) => {
    const key = `${(a ?? c).toUpperCase().replace(/[\s-]+/g, "_")}_${b ?? d}`;
    return canonical.get(key) ?? whole;
  });
}

// type words may be split by spaces or dashes too: "[PHONE IN 1]", "[phone-in-1]"
const FUZZY_BRACKETS = /\[\s*([A-Za-z][A-Za-z0-9_]*(?:[\s-]+[A-Za-z][A-Za-z0-9_]*)*?)[\s_-]+(\d+)\s*\]/g;
const FUZZY_ALL = new RegExp(`${FUZZY_BRACKETS.source}|\\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*?)_(\\d+)\\b`, "g");

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
export { StreamRedactor, RestoreStream } from "./stream.js";
export { verhoeff, verhoeffDigit, luhn, aadhaar, pan, gstin, gstinChecksum } from "./validators.js";

export default Piilite;
