// Redact text that arrives in pieces (LLM token streams, sockets, log tails).
// Text is held back until it is safe: a PII value split across two chunks is
// only emitted once both halves have arrived.

// longer than the longest address the address finder emits (180)
const DEFAULT_HOLD_BACK = 200;
const CONTEXT_KEEP = 80;

export class StreamRedactor {
  constructor(shield, options = {}) {
    this.shield = shield;
    this.holdBack = options.holdBack ?? DEFAULT_HOLD_BACK;
    this.state = shield.newState();
    this.context = ""; // already emitted original text, used only for keyword context
    this.buffer = "";
  }

  get redactionMap() {
    return this.state.map;
  }

  /** Add a chunk. Returns the redacted text that is safe to emit now (may be ""). */
  push(chunk) {
    this.buffer += chunk;
    if (this.buffer.length <= this.holdBack) return "";
    return this.#emit(false);
  }

  /** Flush everything that is left. */
  end() {
    return this.#emit(true);
  }

  #emit(final) {
    const full = this.context + this.buffer;
    const base = this.context.length;
    const found = this.shield.scan(full).filter((d) => d.end > base);

    let cut = full.length;
    if (!final) {
      cut = full.length - this.holdBack;
      // cut at whitespace so a word is never split
      const ws = full.lastIndexOf(" ", cut);
      if (ws > base) cut = ws;
      for (const d of found) if (d.start < cut && d.end > cut) cut = d.start;
      if (cut <= base) return "";
    }

    const emitted = found
      .filter((d) => d.start >= base && d.end <= cut)
      .map((d) => ({ ...d, start: d.start - base, end: d.end - base }));
    const piece = full.slice(base, cut);
    const out = this.shield.apply(piece, emitted, this.state).redacted;

    this.context = full.slice(Math.max(0, cut - CONTEXT_KEEP), cut);
    this.buffer = full.slice(cut);
    return out;
  }
}

/** Redact an async iterable of strings (e.g. an LLM SDK stream). */
export async function* redactAsyncIterable(shield, source, options) {
  const r = new StreamRedactor(shield, options);
  for await (const chunk of source) {
    const out = r.push(typeof chunk === "string" ? chunk : String(chunk));
    if (out) yield out;
  }
  const rest = r.end();
  if (rest) yield rest;
}

/** Web Streams TransformStream<string, string> (Node 18+, browsers, Deno, Bun). */
export function createTransformStream(shield, options) {
  const r = new StreamRedactor(shield, options);
  return new TransformStream({
    transform(chunk, controller) {
      const out = r.push(chunk);
      if (out) controller.enqueue(out);
    },
    flush(controller) {
      const rest = r.end();
      if (rest) controller.enqueue(rest);
    },
  });
}
