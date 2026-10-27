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
