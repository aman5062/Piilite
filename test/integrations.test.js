import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import express from "express";
import { piiliteMiddleware } from "../src/express.js";
import { usePIIDetector, usePiilite } from "../src/react.js";

test("express middleware redacts body and exposes restore", async () => {
  const app = express();
  app.use(express.json(), piiliteMiddleware());
  app.post("/chat", (req, res) => res.json({ body: req.body, back: req.pii.restore(req.body.message), count: req.pii.count }));
  const server = app.listen(0);
  const port = server.address().port;
  const r = await fetch(`http://127.0.0.1:${port}/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "call 9123456780", userId: 7 }),
  }).then((x) => x.json());
  server.close();
  assert.deepEqual(r.body, { message: "call [PHONE_IN_1]", userId: 7 });
  assert.equal(r.back, "call 9123456780");
  assert.equal(r.count, 1);
});

test("express middleware can block requests with PII", async () => {
  const app = express();
  app.use(express.json(), piiliteMiddleware({ block: true, preset: "secrets" }));
  app.post("/x", (req, res) => res.json({ ok: true }));
  const server = app.listen(0);
  const port = server.address().port;
  const post = (body) =>
    fetch(`http://127.0.0.1:${port}/x`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const blocked = await post({ log: "token sk-proj-abc123def456ghi789jkl012mno345pqr" });
  const ok = await post({ log: "all good" });
  server.close();
  assert.equal(blocked.status, 422);
  assert.equal(ok.status, 200);
});

test("react hooks render", () => {
  function Box({ text }) {
    const { hasPII, redacted } = usePIIDetector(text);
    const shield = usePiilite({ mode: "mask" });
    return createElement("p", null, `${hasPII}|${redacted}|${shield.redact(text)}`);
  }
  const html = renderToString(createElement(Box, { text: "call 9123456780" }));
  assert.equal(html, "<p>true|call [PHONE_IN_1]|call XXXXXX6780</p>");
});
