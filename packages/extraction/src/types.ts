import type { ResultFields } from "@voteguard/shared";

export interface ExtractionInput {
  /** SHA-256 of the stored image (hex). */
  sha256: string;
  /** Raw image bytes; the cached adapter does not need them. */
  bytes?: Uint8Array;
}

export interface ExtractionResult {
  fields: ResultFields;
  /** Confidence per figure, 0 to 1. Keys: registered, accredited, valid, rejected, cast, and each party name. */
  confidence: Record<string, number>;
  /** True when any figure is below LOW_CONFIDENCE_THRESHOLD; routes the submission to human review. */
  lowConfidence: boolean;
  engine: "cached-fixture" | "unknown-image" | "anthropic-stub";
}

export interface ExtractionAdapter {
  extract(input: ExtractionInput): Promise<ExtractionResult>;
}
