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

// src/react.js
var react_exports = {};
__export(react_exports, {
  useOpenRedaction: () => useOpenRedaction,
  usePIIDetector: () => usePIIDetector,
  usePiilite: () => usePiilite
});
module.exports = __toCommonJS(react_exports);
var import_react = require("react");
var import_index = require("./index.cjs");
function usePiilite(options) {
  const key = JSON.stringify(options ?? {}, (k, v) => v instanceof RegExp ? v.toString() : typeof v === "function" ? String(v) : v);
  return (0, import_react.useMemo)(() => new import_index.Piilite(options), [key]);
}
function usePIIDetector(text, options) {
  const shield = usePiilite(options);
  return (0, import_react.useMemo)(() => {
    const result = shield.detect(text ?? "");
    return {
      hasPII: result.detections.length > 0,
      redacted: result.redacted,
      detections: result.detections,
      redactionMap: result.redactionMap
    };
  }, [shield, text]);
}
var useOpenRedaction = usePiilite;
