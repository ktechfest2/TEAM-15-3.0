import type { ResultFields } from "@voteguard/shared";
import fixtures from "./fixtures.json";
import type { ExtractionAdapter, ExtractionInput, ExtractionResult } from "./types";

/** Below this a figure is flagged "check" and the submission goes to human review. */
export const LOW_CONFIDENCE_THRESHOLD = 0.8;

const FIXTURE_CONFIDENCE = 0.95;
const PARTIES_WHEN_UNKNOWN = ["Party A", "Party B", "Party C"];

interface Fixture {
  sheet: string;
  fields: ResultFields;
}
const table = fixtures as unknown as Record<string, Fixture>;

function confidenceFor(fields: ResultFields, value: number): Record<string, number> {
  const c: Record<string, number> = {};
  for (const k of ["registered", "accredited", "valid", "rejected", "cast"]) c[k] = value;
  for (const p of Object.keys(fields.parties)) c[p] = value;
  return c;
}

/** Nothing could be read: every figure missing, zero confidence. Never a guess. */
export function unreadable(engine: ExtractionResult["engine"]): ExtractionResult {
  const fields: ResultFields = {
    registered: null, accredited: null, valid: null, rejected: null, cast: null,
    parties: Object.fromEntries(PARTIES_WHEN_UNKNOWN.map((p) => [p, null])),
  };
  return { fields, confidence: confidenceFor(fields, 0), lowConfidence: true, engine };
}

/** Serves stored extraction results for the synthetic DEMO sheets, matched by file hash. */
export class CachedExtractionAdapter implements ExtractionAdapter {
  async extract({ sha256 }: ExtractionInput): Promise<ExtractionResult> {
    const hit = table[sha256];
    if (!hit) return unreadable("unknown-image");
    const confidence = confidenceFor(hit.fields, FIXTURE_CONFIDENCE);
    return {
      fields: hit.fields,
      confidence,
      lowConfidence: Object.values(confidence).some((c) => c < LOW_CONFIDENCE_THRESHOLD),
      engine: "cached-fixture",
    };
  }
}
