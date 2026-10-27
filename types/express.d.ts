import type { Piilite, PiiliteOptions } from "../index.d.ts";

export interface PiiliteMiddlewareOptions extends PiiliteOptions {
  /** Use an existing instance instead of building one from the options */
  shield?: Piilite;
  /** Request fields to redact (default ["body"]) */
  fields?: Array<"body" | "query" | "params" | (string & {})>;
  /** Keys left untouched */
  skipKeys?: string[];
  /** Reject requests that contain PII with 422 */
  block?: boolean;
  onBlock?: (req: any, res: any, next: (err?: unknown) => void) => void;
}

export interface RequestPii {
  count: number;
  redactionMap: Record<string, string>;
  restore(text: string): string;
}

export declare function piiliteMiddleware(options?: PiiliteMiddlewareOptions): (req: any, res: any, next: (err?: unknown) => void) => void;
export default piiliteMiddleware;
