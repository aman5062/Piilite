import { test } from "node:test";
import assert from "node:assert/strict";
import { Piilite, redact, hasPII, restore } from "../src/index.js";

const TEXT = "I am Rahul Sharma, call 9123456780 or mail rahul.sharma@gmail.com. Rahul Sharma again.";

test("placeholder mode with consistent numbering", () => {
  const r = new Piilite().detect(TEXT);
  assert.equal(r.redacted, "I am [NAME_1], call [PHONE_IN_1] or mail [EMAIL_1]. [NAME_1] again.");
  assert.equal(r.redactionMap["[NAME_1]"], "Rahul Sharma");
  assert.equal(r.stats.piiCount, 4);
  assert.deepEqual(r.detections[0].position, [5, 17]);
});

test("restore puts values back into an LLM answer", () => {
  const r = new Piilite().detect(TEXT);
  const answer = "Sure [NAME_1], I will call [PHONE_IN_1].";
  assert.equal(restore(answer, r.redactionMap), "Sure Rahul Sharma, I will call 9123456780.");
});

test("mask modes", () => {
  const m = new Piilite({ mode: "mask" });
  assert.equal(m.redact("call 9123456780"), "call XXXXXX6780");
  assert.equal(m.redact("PAN ABCPS1234K"), "PAN XXXXXX234K");
  assert.equal(m.redact("mail rahul@gmail.com"), "mail rXXXX@gmail.com");
  assert.equal(new Piilite({ mode: "mask-all", maskChar: "*" }).redact("call 9123456780"), "call **********");
  assert.equal(new Piilite({ mode: "remove" }).redact("call 9123456780 now"), "call  now");
  assert.equal(new Piilite({ mode: (d) => `<${d.type}>` }).redact("call 9123456780"), "call <PHONE_IN>");
});

test("types, exclude and allow list", () => {
  assert.equal(new Piilite({ types: ["EMAIL"] }).redact(TEXT).includes("9123456780"), true);
  assert.equal(new Piilite({ exclude: ["NAME"] }).redact(TEXT).includes("Rahul Sharma"), true);
  assert.equal(new Piilite({ allow: ["support@hiresol.in"] }).redact("mail support@hiresol.in"), "mail support@hiresol.in");
});

test("custom patterns use the OpenRedaction pattern shape", () => {
  const s = new Piilite({
    customPatterns: [{ type: "EMPLOYEE_ID", regex: /\bEMP-\d{5}\b/g, priority: 90, placeholder: "[EMP_{n}]", severity: "medium" }],
  });
  assert.equal(s.redact("id EMP-00421"), "id [EMPLOYEE_ID_1]");
});

test("redactObject shares placeholders across fields", () => {
  const { value, redactionMap } = new Piilite().redactObject({
    messages: [{ role: "user", content: "call 9123456780" }, { role: "user", content: "again 9123456780" }],
    count: 2,
  });
  assert.equal(value.messages[0].content, "call [PHONE_IN_1]");
  assert.equal(value.messages[1].content, "again [PHONE_IN_1]");
  assert.equal(value.count, 2);
  assert.equal(redactionMap["[PHONE_IN_1]"], "9123456780");
});

test("default helpers and edge input", () => {
  assert.equal(redact("PAN ABCPS1234K"), "PAN [PAN_1]");
  assert.equal(hasPII("hello world"), false);
  assert.equal(hasPII(""), false);
  assert.deepEqual(new Piilite().scan(undefined), []);
});

test("works with await like OpenRedaction", async () => {
  const r = await new Piilite().detect("PAN ABCPS1234K");
  assert.equal(r.redacted, "PAN [PAN_1]");
});

test("README quick start output", () => {
  assert.equal(
    new Piilite().redact("Myself Ankit Kumar Gupta, call 9123456780 or pay ankit@okhdfcbank. PAN ABCPS1234K, OTP is 482913"),
    "Myself [NAME_1], call [PHONE_IN_1] or pay [UPI_ID_1]. PAN [PAN_1], OTP is [OTP_1]"
  );
});

test("matchCase: true keeps each spelling of a repeated value", () => {
  const s = new Piilite({ matchCase: true });
  const r = s.detect("Mail Ravi.K@Mail.test or ravi.k@mail.test");
  assert.equal(r.redacted, "Mail [EMAIL_1] or [EMAIL_2]");
  assert.equal(s.restore(r.redacted, r.redactionMap), "Mail Ravi.K@Mail.test or ravi.k@mail.test");
});

test("by default, spellings of one value share a placeholder", () => {
  const r = new Piilite().detect("Mail Ravi.K@Mail.test or ravi.k@mail.test");
  assert.equal(r.redacted, "Mail [EMAIL_1] or [EMAIL_1]");
  assert.equal(r.redactionMap["[EMAIL_1]"], "Ravi.K@Mail.test");
});

test("skipFakeNumbers: false redacts test-looking numbers", () => {
  assert.equal(new Piilite().redact("call +91 98765 43210"), "call +91 98765 43210");
  assert.equal(new Piilite({ skipFakeNumbers: false }).redact("call +91 98765 43210"), "call [PHONE_IN_1]");
  assert.equal(new Piilite({ preset: "strict" }).redact("call 9999999999"), "call [PHONE_IN_1]");
});

test("RAG session: question, passages and history share placeholders", () => {
  const shield = new Piilite();
  const session = shield.session();
  const [question, p1, p2] = session.redactAll([
    "what did rahul sharma approve?",
    "Budget v2 was approved by Rahul Sharma on Monday.",
    "Rahul Sharma (9123456780) asked for a review. Call +91 91234 56780.",
  ]);
  assert.equal(question, "what did [NAME_1] approve?");
  assert.equal(p1, "Budget v2 was approved by [NAME_1] on Monday.");
  assert.equal(p2, "[NAME_1] ([PHONE_IN_1]) asked for a review. Call [PHONE_IN_1].");
  assert.equal(session.restore("[NAME_1] approved Budget v2."), "Rahul Sharma approved Budget v2.");
});

test("a bare first name with no clue is masked once the full name is known", () => {
  const [q, doc] = new Piilite().redactAll(["what did rahul approve", "Approved by Rahul Sharma"]);
  assert.equal(q, "what did [NAME_1] approve");
  assert.equal(doc, "Approved by [NAME_1]");
  // within one text too
  assert.equal(new Piilite().redact("Approved by Rahul Sharma. Later rahul changed it."), "Approved by [NAME_1]. Later [NAME_1] changed it.");
});

test("common name parts are not spread on their own", () => {
  assert.equal(new Piilite().redact("Approved by Gurpreet Singh. Singh is also a surname."), "Approved by [NAME_1]. Singh is also a surname.");
});

test("session.detect remembers values across calls", () => {
  const s = new Piilite().session();
  s.redact("Approved by Rahul Sharma");
  assert.equal(s.redact("ask rahul"), "ask [NAME_1]");
});

test("propagate: false turns known-value matching off", () => {
  assert.equal(new Piilite({ propagate: false }).redactAll(["ask rahul", "Approved by Rahul Sharma"])[0], "ask rahul");
});

test("restore stream never shows half a placeholder", () => {
  const map = { "[NAME_1]": "Rahul Sharma", "[PHONE_IN_1]": "9123456780" };
  const text = "Hi [NAME_1], I will call [PHONE IN 1]. NAME_1 agreed.";
  for (const size of [1, 2, 3, 5, 8]) {
    const r = new Piilite().createRestoreStream(map);
    let out = "";
    for (const c of text.match(new RegExp(`[\\s\\S]{1,${size}}`, "g"))) {
      const piece = r.push(c);
      assert.ok(!/\[[A-Z]|NAME_|PHONE/.test(piece), `chunk size ${size} leaked "${piece}"`);
      out += piece;
    }
    out += r.end();
    assert.equal(out, "Hi Rahul Sharma, I will call 9123456780. Rahul Sharma agreed.", `chunk size ${size}`);
  }
});

test("restoreStream over an async iterable, and session restore streams", async () => {
  const s = new Piilite().session();
  s.redact("Approved by Rahul Sharma");
  async function* model() {
    yield "Sure, [NA";
    yield "ME_1] did.";
  }
  let out = "";
  for await (const piece of s.restoreStream(model())) out += piece;
  assert.equal(out, "Sure, Rahul Sharma did.");
});

test("fuzzy restore handles spaces inside the type name", () => {
  assert.equal(restore("call [PHONE IN 1] or [phone-in-1]", { "[PHONE_IN_1]": "9123456780" }), "call 9123456780 or 9123456780");
});

test('fuzzy: "brackets" leaves bare words like EMAIL_1 alone', () => {
  const map = { "[EMAIL_1]": "a@b.test" };
  assert.equal(restore("Set EMAIL_1 to [EMAIL 1]", map), "Set a@b.test to a@b.test");
  assert.equal(restore("Set EMAIL_1 to [EMAIL 1]", map, { fuzzy: "brackets" }), "Set EMAIL_1 to a@b.test");
});
