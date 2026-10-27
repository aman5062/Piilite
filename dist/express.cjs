var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/express.js
var express_exports = {};
__export(express_exports, {
  default: () => express_default,
  piiliteMiddleware: () => piiliteMiddleware
});
module.exports = __toCommonJS(express_exports);
var import_index = require("./index.cjs");
function piiliteMiddleware(options = {}) {
  const { shield = new import_index.Piilite(options), fields = ["body"], skipKeys = [], block = false, onBlock } = options;
  return function piilite(req, res, next) {
    const maps = {};
    let count = 0;
    for (const field of fields) {
      const input = req[field];
      if (input == null) continue;
      const { value, redactionMap } = shield.redactObject(input, { skipKeys });
      Object.assign(maps, redactionMap);
      count += Object.keys(redactionMap).length;
      if (field === "query" && typeof input === "object") {
        for (const k of Object.keys(input)) delete input[k];
        Object.assign(input, value);
      } else req[field] = value;
    }
    req.pii = { count, redactionMap: maps, restore: (text) => (0, import_index.restore)(text, maps) };
    if (block && count > 0) {
      if (onBlock) return onBlock(req, res, next);
      res.statusCode = 422;
      res.setHeader?.("content-type", "application/json");
      return res.end(JSON.stringify({ error: "Request contains personal data", count }));
    }
    next();
  };
}
var express_default = piiliteMiddleware;
