export type Severity = "critical" | "high" | "medium" | "low";

export type PiiType =
  | "AADHAAR" | "AADHAAR_VID" | "PAN" | "GSTIN" | "TAN" | "CIN" | "UPI_ID" | "BANK_ACCOUNT" | "IFSC"
  | "PHONE_IN" | "VOTER_ID" | "PASSPORT_IN" | "DRIVING_LICENSE" | "VEHICLE_REG" | "RATION_CARD"
  | "ABHA" | "ABHA_ADDRESS" | "UAN" | "ESIC" | "OTP" | "PIN_SECRET" | "DATE_OF_BIRTH" | "PINCODE"
  | "NAME" | "ADDRESS" | "EMAIL" | "PHONE" | "CREDIT_CARD" | "CVV" | "CARD_EXPIRY" | "IBAN" | "SWIFT_BIC"
  | "SSN" | "IP_ADDRESS" | "MAC_ADDRESS" | "IMEI" | "SOCIAL_PROFILE" | "API_KEY" | "PRIVATE_KEY" | "JWT"
  | "BEARER_TOKEN" | "CONNECTION_STRING" | "URL_CREDENTIALS" | "PASSWORD"
  | (string & {});

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
  /** Accept a failed validator when context is present */
  lenient?: boolean;
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
  stats: { piiCount: number; processingTime: number };
}

export type RedactionMode = "placeholder" | "mask" | "mask-all" | "remove" | ((match: PiiMatch) => string);

export interface PiiliteOptions {
  /** How to replace PII (default "placeholder" → "[PHONE_IN_1]") */
  mode?: RedactionMode;
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

export declare class Piilite {
  constructor(options?: PiiliteOptions);
  options: PiiliteOptions;
  scan(text: string): PiiMatch[];
  hasPII(text: string): boolean;
  detect(text: string): DetectionResult;
  redact(text: string): string;
  redactObject<T>(value: T): { value: T; redactionMap: Record<string, string> };
  restore(text: string, redactionMap: Record<string, string>): string;
}

export declare const PII_TYPES: string[];
export declare const builtinPatterns: PiiPattern[];

export declare function redact(text: string): string;
export declare function scan(text: string): PiiMatch[];
export declare function detect(text: string): DetectionResult;
export declare function hasPII(text: string): boolean;
export declare function restore(text: string, redactionMap: Record<string, string>): string;

export declare function verhoeff(num: string): boolean;
export declare function verhoeffDigit(num: string): number;
export declare function luhn(num: string): boolean;
export declare function aadhaar(value: string): boolean;
export declare function pan(value: string): boolean;
export declare function gstin(value: string): boolean;
export declare function gstinChecksum(value: string): string;

export default Piilite;
