import type { ResultFields, Status } from "@voteguard/shared";
import { statusCopy } from "../status-copy";

const FIXED_BEFORE = [["registered", "Registered voters"], ["accredited", "Accredited voters"]] as const;
const FIXED_AFTER = [["valid", "Valid votes"], ["rejected", "Rejected votes"], ["cast", "Total votes cast"]] as const;

export interface FieldRow { key: string; label: string; value: number | null }

export function fieldRows(f: ResultFields): FieldRow[] {
  const get = (k: string): number | null => (k in f.parties ? f.parties[k]! : (f as unknown as Record<string, number | null>)[k] ?? null);
  return [
    ...FIXED_BEFORE.map(([key, label]) => ({ key, label, value: get(key) })),
    ...Object.keys(f.parties).map((key) => ({ key, label: key, value: f.parties[key]! })),
    ...FIXED_AFTER.map(([key, label]) => ({ key, label, value: get(key) })),
  ];
}

/** Figures that are not identical across every photo. A party missing from one photo counts as different. */
export function differingKeys(all: ResultFields[]): Set<string> {
  const out = new Set<string>();
  if (all.length < 2) return out;
  const keys = new Set(all.flatMap((f) => fieldRows(f).map((r) => r.key)));
  for (const k of keys) {
    const vals = all.map((f) => {
      const row = fieldRows(f).find((r) => r.key === k);
      return row === undefined ? undefined : row.value;
    });
    if (vals.some((v) => v !== vals[0])) out.add(k);
  }
  return out;
}

const DECISIONS: Record<string, string> = {
  matches_1: "Photo 1 matches the posted sheet",
  matches_2: "Photo 2 matches the posted sheet",
  request_new_photo: "Please send a new photo",
  leave_open: "Leave open for now",
};
export const DECISION_KEYS = Object.keys(DECISIONS);
export const decisionLabel = (d: string): string => DECISIONS[d] ?? d;

/** One plain sentence per audit event. Neutral wording only. */
export function eventSentence(type: string, p: Record<string, unknown>): string {
  switch (type) {
    case "submission.fingerprinted": return "A photo was received with its on-device fingerprint.";
    case "submission.hash_checked": return p.match ? "The server re-checked the stored photo: the fingerprint matched." : "The server re-checked the stored photo: the fingerprint did not match.";
    case "submission.hash_mismatch": return "This photo was flagged for a person to check, because its fingerprint changed.";
    case "extraction.recorded": return "The figures were read from the photo by a machine.";
    case "verification.recorded": return p.arithmetic_ok ? "The arithmetic checks: the numbers add up." : "The arithmetic checks: some numbers do not add up.";
    case "extraction.confirmed": return "The observer confirmed or corrected the figures.";
    case "status.changed": return `Status changed to “${statusCopy(p.to as Status, "en").label}”.`;
    case "review.recorded": return `A reviewer recorded a decision: ${decisionLabel(String(p.decision))}.`;
    default: return type;
  }
}

/** "" is missing (null). A whole number is kept. Anything else is NaN so the form can refuse it. */
export function parseFigure(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  return /^-?\d+$/.test(t) ? Number(t) : NaN;
}

export type FigureInputs = Record<string, string>;
export function toInputs(f: ResultFields): FigureInputs {
  const out: FigureInputs = {};
  for (const r of fieldRows(f)) out[r.key] = r.value === null ? "" : String(r.value);
  return out;
}
/** Build figures from form inputs, or null when any input is not a whole number. */
export function fromInputs(i: FigureInputs): ResultFields | null {
  const n = (k: string) => parseFigure(i[k] ?? "");
  const parties: ResultFields["parties"] = {};
  const fixed = new Set(["registered", "accredited", "valid", "rejected", "cast"]);
  for (const k of Object.keys(i)) if (!fixed.has(k)) parties[k] = n(k);
  const vals = [n("registered"), n("accredited"), n("valid"), n("rejected"), n("cast"), ...Object.values(parties)];
  if (vals.some((v) => typeof v === "number" && Number.isNaN(v))) return null;
  return { registered: n("registered"), accredited: n("accredited"), parties, valid: n("valid"), rejected: n("rejected"), cast: n("cast") };
}
