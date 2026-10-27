// Express / Connect middleware. No dependencies.
//
//   import { piiliteMiddleware } from "piilite/express";
//   app.use(express.json(), piiliteMiddleware({ preset: "dpdp" }));
//
// Redacts req.body (and optionally req.query) before your handlers see it.
// The original values stay on req.pii so you can restore an LLM answer.
import { Piilite, restore } from "./index.js";

export function piiliteMiddleware(options = {}) {
  const { shield = new Piilite(options), fields = ["body"], skipKeys = [], block = false, onBlock } = options;

  return function piilite(req, res, next) {
    const maps = {};
    let count = 0;
    for (const field of fields) {
      const input = req[field];
      if (input == null) continue;
      const { value, redactionMap } = shield.redactObject(input, { skipKeys });
      Object.assign(maps, redactionMap);
      count += Object.keys(redactionMap).length;
      // req.query is a getter in Express 5, so replace its keys instead of the object
      if (field === "query" && typeof input === "object") {
        for (const k of Object.keys(input)) delete input[k];
        Object.assign(input, value);
      } else req[field] = value;
    }

    req.pii = { count, redactionMap: maps, restore: (text) => restore(text, maps) };

    if (block && count > 0) {
      if (onBlock) return onBlock(req, res, next);
      res.statusCode = 422;
      res.setHeader?.("content-type", "application/json");
      return res.end(JSON.stringify({ error: "Request contains personal data", count }));
    }
    next();
  };
}

export default piiliteMiddleware;
