import type { Comparison, FieldDifference, ResultFields, SubmissionEvidence } from "@voteguard/shared";

function flatten(f: ResultFields): Map<string, number | null> {
  const m = new Map<string, number | null>();
  m.set("registered", f.registered);
  m.set("accredited", f.accredited);
  for (const [k, v] of Object.entries(f.parties)) m.set(k, v);
  m.set("valid", f.valid);
  m.set("rejected", f.rejected);
  m.set("cast", f.cast);
  return m;
}

/**
 * Field-by-field comparison. Two submissions are independent only if they come from
 * different submitters AND are different files; the same file from two senders is one photo.
 */
export function compareSubmissions(a: SubmissionEvidence, b: SubmissionEvidence): Comparison {
  const independent = a.submitterId !== b.submitterId && a.sha256 !== b.sha256;
  const fa = flatten(a.fields);
  const fb = flatten(b.fields);
  const keys = [...new Set([...fa.keys(), ...fb.keys()])];
  const differences: FieldDifference[] = [];
  for (const key of keys) {
    const va = fa.get(key) ?? null;
    const vb = fb.get(key) ?? null;
    if (va !== vb) differences.push({ field: key, a: va, b: vb });
  }
  return { independent, agree: differences.length === 0, differences };
}
