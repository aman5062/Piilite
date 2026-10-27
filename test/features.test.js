import { test } from "node:test";
import assert from "node:assert/strict";
import { Piilite, restore, presets } from "../src/index.js";
import { makeAadhaar } from "./helpers.js";

const chunked = (text, size) => text.match(new RegExp(`[\\s\\S]{1,${size}}`, "g"));

test("stream: PII split across chunks is still caught", () => {
  const text = "Hi, I am Rahul Sharma. Call me on 9123456780 or mail rahul.sharma@gmail.com. PAN ABCPS1234K. ".repeat(3);
  const expected = new Piilite().redact(text);
  for (const size of [1, 3, 7, 16, 50]) {
    const s = new Piilite().createStream();
    let out = "";
    for (const c of chunked(text, size)) out += s.push(c);
    out += s.end();
    assert.equal(out, expected, `chunk size ${size}`);
  }
});

test("stream: placeholders match a one-shot detect and restore works", () => {
  const s = new Piilite().createStream();
  let out = s.push("call 91234 5");
  out += s.push("6780 now") + s.end();
  assert.equal(out, "call [PHONE_IN_1] now");
  assert.equal(restore(out, s.redactionMap), "call 91234 56780 now");
});

test("stream: async iterable and Web TransformStream", async () => {
  async function* tokens() {
    for (const t of ["my otp ", "is 48", "2913 ok"]) yield t;
  }
  let out = "";
  for await (const piece of new Piilite().redactStream(tokens())) out += piece;
  assert.equal(out, "my otp is [OTP_1] ok");

  const { readable, writable } = new Piilite().transformStream();
  const w = writable.getWriter();
  w.write("PAN ABC");
  w.write("PS1234K done");
  w.close();
  let res = "";
  for await (const piece of readable) res += piece;
  assert.equal(res, "PAN [PAN_1] done");
});

test("presets limit types", () => {
  const kyc = new Piilite({ preset: "kyc" });
  assert.equal(kyc.redact("PAN ABCPS1234K key sk-proj-abc123def456ghi789jkl012mno345pqr"), "PAN [PAN_1] key sk-proj-abc123def456ghi789jkl012mno345pqr");
  const secrets = new Piilite({ preset: "secrets" });
  assert.equal(secrets.redact("PAN ABCPS1234K pwd: hunter22"), "PAN ABCPS1234K pwd: [PASSWORD_1]");
  assert.ok(presets.dpdp.types.includes("AADHAAR"));
  assert.throws(() => new Piilite({ preset: "nope" }), /unknown preset/);
  // user options override the preset
  assert.equal(new Piilite({ preset: "pci", types: ["PAN"] }).redact("PAN ABCPS1234K"), "PAN [PAN_1]");
});

test("fuzzy restore handles placeholders rewritten by a model", () => {
  const map = { "[NAME_1]": "Rahul Sharma", "[PHONE_IN_1]": "9123456780" };
  assert.equal(restore("Hi [NAME 1], calling [phone_in_1]", map), "Hi Rahul Sharma, calling 9123456780");
  assert.equal(restore("Hi NAME_1 and [ NAME-1 ]", map), "Hi Rahul Sharma and Rahul Sharma");
  assert.equal(restore("Hi [NAME 2]", map), "Hi [NAME 2]");
  assert.equal(restore("Hi [NAME 1]", map, { fuzzy: false }), "Hi [NAME 1]");
});

test("onDetect audit hook and per-type stats", () => {
  const seen = [];
  const s = new Piilite({ onDetect: (r) => seen.push(r.stats.byType) });
  s.detect("call 9123456780 or 9123456781, PAN ABCPS1234K");
  assert.deepEqual(seen, [{ PHONE_IN: 2, PAN: 1 }]);
});

test("maxInputSize guards huge input", () => {
  assert.throws(() => new Piilite({ maxInputSize: 10 }).scan("x".repeat(11)), RangeError);
});

test("redactObject skipKeys", () => {
  const { value } = new Piilite().redactObject({ id: "9123456780", phone: "9123456780" }, { skipKeys: ["id"] });
  assert.deepEqual(value, { id: "9123456780", phone: "[PHONE_IN_1]" });
});

test("no catastrophic backtracking on hostile input", () => {
  const s = new Piilite();
  const hostile = [
    "a".repeat(20000),
    "1 ".repeat(10000),
    "9".repeat(20000),
    "my name is " + "Ab ".repeat(5000),
    "address: " + "1, ".repeat(5000),
    "x@".repeat(5000) + "y",
    "nine ".repeat(5000),
    ("-" + "1".repeat(5)).repeat(3000),
    "A".repeat(10000) + "1".repeat(10000),
    "dot at ".repeat(4000) + "com",
  ];
  for (const h of hostile) {
    const t0 = performance.now();
    s.scan(h);
    const ms = performance.now() - t0;
    assert.ok(ms < 1500, `${JSON.stringify(h.slice(0, 20))}... took ${ms.toFixed(0)}ms`);
  }
});

test("Aadhaar in a long realistic document", () => {
  const a = makeAadhaar("49183726501");
  const doc = ("Order 123 shipped. ".repeat(200) + `aadhaar ${a}. `).repeat(5);
  assert.equal(new Piilite().scan(doc).filter((d) => d.type === "AADHAAR").length, 5);
});
