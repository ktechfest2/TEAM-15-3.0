import { CachedExtractionAdapter, unreadable } from "./cached";
import type { ExtractionAdapter, ExtractionInput, ExtractionResult } from "./types";

/**
 * STUB for the Anthropic vision integration. It makes no network call and needs no key.
 * Known DEMO sheets are served from the cache so the demo works; anything else is returned
 * as unreadable and flagged for human review. Replace `extract` with a real call later.
 */
export class AnthropicStubAdapter implements ExtractionAdapter {
  private cache = new CachedExtractionAdapter();

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const cached = await this.cache.extract(input);
    if (cached.engine === "cached-fixture") return cached;
    return unreadable("anthropic-stub");
  }
}
