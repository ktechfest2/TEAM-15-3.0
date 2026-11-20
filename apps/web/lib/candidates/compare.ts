import type { GuideLang } from "../guide/langs";
import { FIELD_ORDER, type Candidate, type FieldName } from "./data";

export interface CompareRow { field: FieldName; a: string; b: string; same: boolean }

function valueOf(c: Candidate, f: FieldName): string {
  switch (f) {
    case "party": return `${c.partyName} (${c.party})`;
    case "age": return String(c.age);
    case "qualifications": return c.qualifications;
    case "running_mate": return c.runningMate.name;
  }
}

/** Two candidates side by side, field by field in the fixed order. It says what matches, never who is ahead. */
export function compareCandidates(a: Candidate, b: Candidate, _lang: GuideLang): CompareRow[] {
  return FIELD_ORDER.map((field) => {
    const ta = valueOf(a, field), tb = valueOf(b, field);
    return { field, a: ta, b: tb, same: ta === tb };
  });
}
