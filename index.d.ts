export type Severity = "critical" | "high" | "medium" | "low";

export type PiiType =
  | "AADHAAR" | "AADHAAR_VID" | "PAN" | "GSTIN" | "TAN" | "CIN" | "UPI_ID" | "BANK_ACCOUNT" | "IFSC"
  | "PHONE_IN" | "VOTER_ID" | "PASSPORT_IN" | "DRIVING_LICENSE" | "VEHICLE_REG" | "RATION_CARD"
  | "ABHA" | "ABHA_ADDRESS" | "UAN" | "ESIC" | "OTP" | "PIN_SECRET" | "DATE_OF_BIRTH" | "PINCODE"
  | "NAME" | "ADDRESS" | "LOCATION" | "EMAIL" | "PHONE" | "CREDIT_CARD" | "CVV" | "CARD_EXPIRY" | "IBAN" | "SWIFT_BIC"
  | "SSN" | "IP_ADDRESS" | "MAC_ADDRESS" | "IMEI" | "SOCIAL_PROFILE" | "API_KEY" | "PRIVATE_KEY" | "JWT"
  | "BEARER_TOKEN" | "CONNECTION_STRING" | "URL_CREDENTIALS" | "PASSWORD"
  | (string & {});

export type PresetName =
  | "dpdp" | "kyc" | "fintech" | "pci" | "healthcare" | "hr" | "secrets" | "gdpr" | "hipaa" | "strict" | "precise";

/** Same shape as OpenRedaction's PIIPattern, plus optional piilite fields. */
export interface PiiPattern {
  type: string;
  regex?: RegExp;
  /** Finder function alternative to `regex` */
  find?: (text: string) => Array<{ start: number; end: number; confidence?: number }>;
  priority?: number;
  validator?: (value: string, context: string) => boolean;
  placeholder?: string;
  description?: string;
  severity?: Severity;
  /** Base confidence 0-1 (default 0.8) */
  confidence?: number;
  /** Capture group to use as the PII span */
  group?: number;
  /** Keywords looked for around the match; boost confidence */
  context?: RegExp;
  /** Drop the match when no context keyword is near it */
  requireContext?: boolean;
  /** Look for context only before the match */
  contextOnly?: "before";
  contextWindow?: number;
  contextAfter?: number;
  /** Keyword regex that rejects the match unless `context` also matches */
  negativeContext?: RegExp;
  /** Accept a failed validator when context is present */
  lenient?: boolean;
  /** Only runs when named in `types` or `include` */
  optIn?: boolean;
  /** May be trimmed around higher-priority matches instead of dropped */
  region?: boolean;
}

export interface PiiMatch {
  type: PiiType;
  value: string;
  start: number;
  end: number;
  severity: Severity;
  confidence: number;
}

export interface PiiDetection {
  type: PiiType;
  value: string;
  placeholder: string;
  position: [number, number];
  severity: Severity;
  confidence: number;
}

export interface DetectionResult {
  original: string;
  redacted: string;
  detections: PiiDetection[];
  redactionMap: Record<string, string>;
  stats: { piiCount: number; processingTime: number; byType: Record<string, number> };
}

export type RedactionMode = "placeholder" | "mask" | "mask-all" | "remove" | ((match: PiiMatch) => string);

export interface PiiliteOptions {
  /** Ready-made type set; your other options override it */
  preset?: PresetName;
  /** Throw a RangeError above this many characters (default 5,000,000) */
  maxInputSize?: number;
  /** Called after every detect(); use it for audit logs (types, counts, positions) */
  onDetect?: (result: DetectionResult) => void;
  /** How to replace PII (default "placeholder" → "[PHONE_IN_1]") */
  mode?: RedactionMode;
  /** Also run opt-in types, e.g. ["LOCATION"] */
  include?: PiiType[];
  /** Only detect these types */
  types?: PiiType[];
  /** Detect everything except these types */
  exclude?: PiiType[];
  /** Values (exact, case-insensitive) or regexes that are never redacted */
  allow?: Array<string | RegExp>;
  /** Extra patterns; OpenRedaction PIIPattern objects work as-is */
  customPatterns?: PiiPattern[];
  /** Give "RAHUL" and "Rahul" separate placeholders (default false: one placeholder, best spelling restored) */
  matchCase?: boolean;
  /** Mask values seen earlier in the text or session wherever they appear again, incl. parts of names (default true) */
  propagate?: boolean;
  /** Leave addresses that follow a company name ("Acme Pvt Ltd, Sector 62, Noida") unmasked (default false) */
  keepCompanyAddresses?: boolean;
  /** Skip test-looking numbers such as 9876543210 or 9999999999 (default true) */
  skipFakeNumbers?: boolean;
  /** Drop matches below this confidence (default 0.5) */
  minConfidence?: number;
  /** Mask character for mask modes (default "X") */
  maskChar?: string;
  /** Digits kept visible in "mask" mode (default 4) */
  keepLast?: number;
  /** Custom placeholder text for "placeholder" mode */
  placeholder?: (type: string, n: number, value: string) => string;
}

export interface RedactionState {
  counters: Record<string, number>;
  seen: Map<string, string>;
  map: Record<string, string>;
  known: Map<string, { type: string; alias: string; severity?: Severity; part?: boolean }>;
}

export interface StreamOptions {
  /** Characters held back until it is safe to emit them (default 200) */
  holdBack?: number;
  /** Share placeholders with a session or other calls */
  state?: RedactionState;
}

export declare class StreamRedactor {
  constructor(shield: Piilite, options?: StreamOptions);
  readonly redactionMap: Record<string, string>;
  /** Add a chunk; returns redacted text that is safe to emit now (may be "") */
  push(chunk: string): string;
  /** Flush the rest */
  end(): string;
}

export interface RestoreOptions {
  /**
   * true (default): also restore "[NAME 1]", "[name_1]", "[PHONE IN 1]" and bare "NAME_1".
   * "brackets": only bracketed forms. false: exact placeholders only.
   */
  fuzzy?: boolean | "brackets";
}

export declare class RestoreStream {
  constructor(redactionMap: Record<string, string>, options?: RestoreOptions);
  /** Add a chunk of model output; returns restored text, holding back a possible partial placeholder */
  push(chunk: string): string;
  end(): string;
}

/** One set of placeholders shared across many calls (question, passages, history, answer). */
export interface PiiliteSession {
  readonly state: RedactionState;
  readonly redactionMap: Record<string, string>;
  detect(text: string): DetectionResult;
  redact(text: string): string;
  detectAll(texts: string[]): DetectionResult[];
  redactAll(texts: string[]): string[];
  redactObject<T>(value: T, options?: { skipKeys?: string[] }): { value: T; redactionMap: Record<string, string> };
  restore(text: string, options?: RestoreOptions): string;
  createRestoreStream(options?: RestoreOptions): RestoreStream;
  restoreStream(source: AsyncIterable<string>, options?: RestoreOptions): AsyncGenerator<string>;
  createStream(options?: StreamOptions): StreamRedactor;
}

export declare class Piilite {
  constructor(options?: PiiliteOptions);
  options: PiiliteOptions;
  patterns: PiiPattern[];
  scan(text: string): PiiMatch[];
  hasPII(text: string): boolean;
  detect(text: string, state?: RedactionState): DetectionResult;
  redact(text: string): string;
  /** Scan all texts first, then redact each with shared placeholders */
  detectAll(texts: string[], state?: RedactionState): DetectionResult[];
  redactAll(texts: string[], state?: RedactionState): string[];
  /** Rule matches plus values already known to the state */
  find(text: string, state?: RedactionState): PiiMatch[];
  session(): PiiliteSession;
  redactObject<T>(value: T, options?: { skipKeys?: string[]; state?: RedactionState }): { value: T; redactionMap: Record<string, string> };
  createRestoreStream(redactionMap: Record<string, string>, options?: RestoreOptions): RestoreStream;
  restoreStream(source: AsyncIterable<string>, redactionMap: Record<string, string>, options?: RestoreOptions): AsyncGenerator<string>;
  restore(text: string, redactionMap: Record<string, string>, options?: RestoreOptions): string;
  createStream(options?: StreamOptions): StreamRedactor;
  redactStream(source: AsyncIterable<string>, options?: StreamOptions): AsyncGenerator<string>;
  transformStream(options?: StreamOptions): TransformStream<string, string>;
  newState(): RedactionState;
  apply(text: string, found: PiiMatch[], state?: RedactionState): { redacted: string; detections: PiiDetection[] };
  getPatterns(): PiiPattern[];
  getCacheStats(): { size: number; maxSize: number; enabled: boolean };
}

export declare const presets: Record<PresetName, Partial<PiiliteOptions>>;

export declare const PII_TYPES: string[];
export declare const builtinPatterns: PiiPattern[];

export declare function redact(text: string): string;
export declare function scan(text: string): PiiMatch[];
export declare function detect(text: string): DetectionResult;
export declare function hasPII(text: string): boolean;
export declare function restore(text: string, redactionMap: Record<string, string>, options?: RestoreOptions): string;

export declare function verhoeff(num: string): boolean;
export declare function verhoeffDigit(num: string): number;
export declare function luhn(num: string): boolean;
export declare function aadhaar(value: string): boolean;
export declare function pan(value: string): boolean;
export declare function gstin(value: string): boolean;
export declare function gstinChecksum(value: string): string;

export default Piilite;
