import { test } from "node:test";
import assert from "node:assert/strict";

let bridge;
try {
  bridge = await import("../src/openredaction.js");
} catch (e) {
  if (e.code !== "ERR_MODULE_NOT_FOUND") throw e;
}
const skip = !bridge && "@openredaction/core not installed";

test("global shield adds OpenRedaction's non-Indian IDs", { skip }, () => {
  const s = bridge.createGlobalShield();
  const t = (text) => s.scan(text).map((d) => d.type);
  assert.ok(t("CPF 529.982.247-25").includes("BRAZILIAN_CPF"));
  assert.ok(t("btc 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa").includes("BITCOIN_ADDRESS"));
  assert.ok(t("eth 0x742d35Cc6634C0532925a3b844Bc454e4438f44e").includes("ETHEREUM_ADDRESS"));
});

test("Indian matches still win over OpenRedaction patterns", { skip }, () => {
  const s = bridge.createGlobalShield();
  assert.deepEqual(s.scan("Mobile: +91 91234 56780, PAN ABCPS1234K").map((d) => d.type), ["PHONE_IN", "PAN"]);
  assert.deepEqual(s.scan("UTR 412398765432 credited"), []);
});

test("JSON processor runs on the piilite detector", { skip }, async () => {
  const { value } = await bridge.redactJson({ user: { name: "Rahul Sharma", phone: "9123456780" }, plan: "pro" });
  assert.notEqual(value.user.phone, "9123456780");
  assert.equal(value.plan, "pro");
});

test("CSV redaction keeps header and rows aligned", { skip }, () => {
  const { csv, redactionMap } = bridge.redactCsv("name,phone,city\nRahul Sharma,9123456780,Pune\nPriya Verma,9876501234,Delhi\n");
  assert.equal(csv, "name,phone,city\n[NAME_1],[PHONE_IN_1],Pune\n[NAME_2],[PHONE_IN_2],Delhi");
  assert.equal(redactionMap["[PHONE_IN_2]"], "9876501234");
});

test("CSV redaction can be limited to columns", { skip }, () => {
  const { csv } = bridge.redactCsv("name,phone\nRahul Sharma,9123456780\n", { columns: ["phone"] });
  assert.equal(csv, "name,phone\nRahul Sharma,[PHONE_IN_1]");
});

test("plain-text documents", { skip }, async () => {
  const r = await bridge.redactDocument(Buffer.from("PAN ABCPS1234K\nphone 9123456780"), { format: "txt" });
  assert.equal(r.redacted, "PAN [PAN_1]\nphone [PHONE_IN_1]");
});
