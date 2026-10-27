import type { Piilite, PiiliteOptions, PiiDetection } from "../index.d.ts";

export declare function usePiilite(options?: PiiliteOptions): Piilite;
export declare function usePIIDetector(
  text: string | null | undefined,
  options?: PiiliteOptions
): { hasPII: boolean; redacted: string; detections: PiiDetection[]; redactionMap: Record<string, string> };
export declare const useOpenRedaction: typeof usePiilite;
