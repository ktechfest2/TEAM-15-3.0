import { statusFor, validateArithmetic } from "@voteguard/evidence";
import { fixtures } from "@voteguard/extraction";
import type { ResultFields, Status, SubmissionEvidence } from "@voteguard/shared";

type Fixture = { sheet: string; fields: ResultFields };
const bySheet = (name: string) => {
  const entry = Object.entries(fixtures as unknown as Record<string, Fixture>).find(([, v]) => v.sheet === name);
  if (!entry) throw new Error(`missing fixture ${name}`);
  return { sha256: entry[0], fields: entry[1].fields };
};

const make = (submitterId: string, sheet: { sha256: string; fields: ResultFields }, shaOverride?: string): SubmissionEvidence => ({
  submitterId,
  sha256: shaOverride ?? sheet.sha256,
  fields: sheet.fields,
  verified: validateArithmetic(sheet.fields).ok,
  lowConfidence: false,
});

/** Synthetic demo submissions per unit code. Units not listed have none. */
export function demoSubmissionsFor(code: string): SubmissionEvidence[] {
  const clean = bySheet("sheet-a-clean");
  switch (code) {
    case "LA-IKJ-04-012": return [make("obs-1", clean), make("obs-2", bySheet("sheet-b-altered-figure"))];
    case "LA-IKJ-04-013": return [make("obs-1", clean), make("obs-2", clean, "b".repeat(64))];
    case "LA-IKJ-04-014": return [make("obs-1", clean)];
    case "LA-IKJ-04-015": return [make("obs-1", bySheet("sheet-c-bad-arithmetic"))];
    default: return [];
  }
}

export function statusForUnit(code: string): Status {
  return statusFor({ submissions: demoSubmissionsFor(code), reviewed: false });
}
