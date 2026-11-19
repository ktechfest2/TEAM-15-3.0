import type { ResultFields } from "@voteguard/shared";
import { HttpError } from "./ports";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
export const isSha256Hex = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{64}$/.test(v);

export function asObject(body: unknown): Record<string, unknown> {
  if (body === null || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "Expected a JSON object.");
  return body as Record<string, unknown>;
}

const count = (v: unknown, name: string): number | null => {
  if (v === null) return null;
  if (typeof v !== "number" || !Number.isInteger(v) || Math.abs(v) > 1_000_000_000) throw new HttpError(400, `${name} must be a whole number or null.`);
  return v;
};

/** Strictly parse figures sent by a client. Never trusts the shape. */
export function parseResultFields(body: unknown): ResultFields {
  const o = asObject(body);
  const p = o.parties;
  if (p === null || typeof p !== "object" || Array.isArray(p)) throw new HttpError(400, "parties must be an object.");
  const entries = Object.entries(p as Record<string, unknown>);
  if (entries.length === 0 || entries.length > 30) throw new HttpError(400, "parties must have between 1 and 30 entries.");
  const parties: ResultFields["parties"] = {};
  for (const [k, v] of entries) {
    if (k.length === 0 || k.length > 40) throw new HttpError(400, "party names must be 1 to 40 characters.");
    parties[k] = count(v, `party ${k}`);
  }
  for (const f of ["registered", "accredited", "valid", "rejected", "cast"]) {
    if (!(f in o)) throw new HttpError(400, `${f} is required.`);
  }
  return {
    registered: count(o.registered, "registered"),
    accredited: count(o.accredited, "accredited"),
    parties,
    valid: count(o.valid, "valid"),
    rejected: count(o.rejected, "rejected"),
    cast: count(o.cast, "cast"),
  };
}

/** Flatten figures into name -> value, for diffs. */
export function flattenFields(f: ResultFields): Map<string, number | null> {
  const m = new Map<string, number | null>();
  m.set("registered", f.registered);
  m.set("accredited", f.accredited);
  for (const [k, v] of Object.entries(f.parties)) m.set(k, v);
  m.set("valid", f.valid);
  m.set("rejected", f.rejected);
  m.set("cast", f.cast);
  return m;
}

export function changedFields(a: ResultFields, b: ResultFields): { field: string; from: number | null; to: number | null }[] {
  const fa = flattenFields(a), fb = flattenFields(b);
  return [...new Set([...fa.keys(), ...fb.keys()])]
    .map((field) => ({ field, from: fa.get(field) ?? null, to: fb.get(field) ?? null }))
    .filter((d) => d.from !== d.to);
}
