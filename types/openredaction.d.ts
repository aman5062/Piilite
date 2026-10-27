import type { Piilite, PiiliteOptions, PiiPattern, DetectionResult } from "../index.d.ts";

/** OpenRedaction pattern types the bridge uses (checked for false matches on Indian text). */
export declare const OPENREDACTION_TYPES: string[];

/** Allowlisted OpenRedaction patterns, ready for `customPatterns`. */
export declare function openRedactionPatterns(options?: { types?: string[] }): PiiPattern[];

/** Piilite with OpenRedaction's global ID, banking, crypto, health and secret patterns added. */
export declare function createGlobalShield(options?: PiiliteOptions & { types?: string[] }): Piilite;

/** Extract text from a PDF / DOCX / image / text buffer (OpenRedaction DocumentProcessor) and redact it. */
export declare function redactDocument(buffer: Uint8Array, options?: { shield?: Piilite; [key: string]: unknown }): Promise<DetectionResult>;

/** Redact a JSON value or JSON string with OpenRedaction's JsonProcessor. */
export declare function redactJson<T = unknown>(data: T | string, options?: { shield?: Piilite; [key: string]: unknown }): Promise<{ value: T; detection: unknown }>;

/** Redact CSV cell by cell with shared placeholders. */
export declare function redactCsv(
  input: string | Uint8Array,
  options?: { shield?: Piilite; header?: boolean; delimiter?: string; quote?: string; columns?: Array<string | number> }
): { csv: string; redactionMap: Record<string, string>; piiCount: number };

/** Find PII in an XLSX workbook (needs the `xlsx` package). */
export declare function detectXlsx(buffer: Uint8Array, options?: { shield?: Piilite; [key: string]: unknown }): Promise<unknown>;

/** The full @openredaction/core module. */
export declare const openredaction: typeof import("@openredaction/core");
