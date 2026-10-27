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
}

export interface StreamOptions {
  /** Characters held back until it is safe to emit them (default 200) */
  holdBack?: number;
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
  /** Also restore "[NAME 1]", "[name_1]", "NAME_1" (default true) */
  fuzzy?: boolean;
}

export declare class Piilite {
  constructor(options?: PiiliteOptions);
  options: PiiliteOptions;
  patterns: PiiPattern[];
  scan(text: string): PiiMatch[];
  hasPII(text: string): boolean;
  detect(text: string, state?: RedactionState): DetectionResult;
  redact(text: string): string;
  redactObject<T>(value: T, options?: { skipKeys?: string[] }): { value: T; redactionMap: Record<string, string> };
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
