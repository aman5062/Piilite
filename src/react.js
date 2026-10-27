// React hooks. Needs react >= 16.8 as a peer dependency.
//
//   import { usePIIDetector } from "piilite/react";
//   const { hasPII, redacted, detections } = usePIIDetector(message);
import { useMemo } from "react";
import { Piilite } from "./index.js";

/** A memoised Piilite instance. Pass stable options (or memoise them). */
export function usePiilite(options) {
  const key = JSON.stringify(options ?? {}, (k, v) => (v instanceof RegExp ? v.toString() : typeof v === "function" ? String(v) : v));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => new Piilite(options), [key]);
}

/** Live PII check for a piece of text, e.g. a chat input before it is sent. */
export function usePIIDetector(text, options) {
  const shield = usePiilite(options);
  return useMemo(() => {
    const result = shield.detect(text ?? "");
    return {
      hasPII: result.detections.length > 0,
      redacted: result.redacted,
      detections: result.detections,
      redactionMap: result.redactionMap,
    };
  }, [shield, text]);
}

// OpenRedaction's hook name, for drop-in migration
export const useOpenRedaction = usePiilite;
