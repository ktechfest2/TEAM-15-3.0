import { CachedExtractionAdapter } from "./cached";
import { AnthropicStubAdapter } from "./live-stub";
import type { ExtractionAdapter } from "./types";

export type { ExtractionAdapter, ExtractionInput, ExtractionResult } from "./types";
export { CachedExtractionAdapter, LOW_CONFIDENCE_THRESHOLD } from "./cached";
export { AnthropicStubAdapter } from "./live-stub";

export interface ExtractionConfig {
  mode: "cached" | "live";
  /** Accepted but unused while the Anthropic integration is a stub. */
  anthropicApiKey?: string;
}

/** EXTRACTION_MODE=cached uses fixtures; live uses the (currently stubbed) Anthropic adapter. */
export function createExtractionAdapter(config: ExtractionConfig): ExtractionAdapter {
  return config.mode === "live" ? new AnthropicStubAdapter() : new CachedExtractionAdapter();
}
