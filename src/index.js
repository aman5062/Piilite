import { findAll } from "./engine.js";
import { indiaPatterns } from "./patterns/india.js";
import { globalPatterns } from "./patterns/global.js";
import { secretPatterns } from "./patterns/secrets.js";
import { findNames } from "./finders/names.js";
import { findAddresses } from "./finders/address.js";

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
    this.options = { ...DEFAULTS, ...options };
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

  /**
   * Detect and redact PII. Returns the same shape as OpenRedaction's detect(),
   * so `await shield.detect(text)` works for both libraries.
   */
  detect(text, state = { counters: {}, seen: new Map(), map: {} }) {
    const t0 = Date.now();
    const found = this.scan(text);
    const opts = this.options;
    let out = "";
    let last = 0;
    const detections = [];

    for (const d of found) {
      const key = d.type + "\u0000" + d.value.toLowerCase();
      let placeholder = state.seen.get(key);
      if (!placeholder) {
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

    return {
      original: text,
      redacted: out,
      detections,
      redactionMap: state.map,
      stats: { piiCount: detections.length, processingTime: Date.now() - t0 },
    };
  }

  /** Shortcut that returns only the redacted string. */
  redact(text) {
    return this.detect(text).redacted;
  }

  /**
   * Redact every string inside an object or array (e.g. a chat payload or a
   * tool result). Placeholders are shared across all strings, so the same
   * value always gets the same placeholder.
   */
  redactObject(value) {
    const state = { counters: {}, seen: new Map(), map: {} };
    const walk = (v) => {
      if (typeof v === "string") return this.detect(v, state).redacted;
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
      return v;
    };
    return { value: walk(value), redactionMap: state.map };
  }

  /** Put the original values back, e.g. into an LLM answer. */
  restore(text, redactionMap) {
    return restore(text, redactionMap);
  }
}

export function restore(text, redactionMap) {
  const keys = Object.keys(redactionMap ?? {}).sort((a, b) => b.length - a.length);
  if (!keys.length) return text;
  const re = new RegExp(keys.map(escapeRe).join("|"), "g");
  return text.replace(re, (k) => redactionMap[k]);
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

export { verhoeff, verhoeffDigit, luhn, aadhaar, pan, gstin, gstinChecksum } from "./validators.js";

export default Piilite;
