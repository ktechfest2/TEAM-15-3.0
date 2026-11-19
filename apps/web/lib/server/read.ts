import { narrate } from "@voteguard/evidence";
import type { ArithmeticCheck, Comparison, Language, ResultFields, Status } from "@voteguard/shared";
import { loadUnit } from "./evidence";
import { HttpError, type Deps } from "./ports";

export interface UnitFilter { state?: string; lga?: string; ward?: string; q?: string }
export interface PublicUnit { id: string; code: string; name: string; ward: string; lga: string; state: string }

export async function listUnits(deps: Deps, f: UnitFilter): Promise<PublicUnit[]> {
  const q = f.q?.trim().toLowerCase();
  return (await deps.db.listUnits())
    .filter((u) => (!f.state || u.state === f.state) && (!f.lga || u.lga === f.lga) && (!f.ward || u.ward === f.ward))
    .filter((u) => !q || u.code.toLowerCase().includes(q) || u.name.toLowerCase().includes(q))
    .slice(0, 100)
    .map(({ id, code, name, ward, lga, state }) => ({ id, code, name, ward, lga, state }));
}

export interface PublicSubmission {
  id: string;
  sha256: string;
  hash_match: boolean | null;
  captured_at: string;
  image_url: string;
  fields: ResultFields;
  confidence: Record<string, number>;
  low_confidence: boolean;
  verified: boolean;
  confirmed_by_observer: boolean;
  checks: ArithmeticCheck[];
}

/** What anyone may see about a unit. No submitter or reviewer identity anywhere. */
export async function unitEvidence(deps: Deps, unitId: string) {
  const u = await loadUnit(deps, unitId);
  const subs: PublicSubmission[] = u.submissions.map((s) => ({
    id: s.sub.id, sha256: s.sub.sha256_server ?? s.sub.sha256_client, hash_match: s.sub.hash_match,
    captured_at: s.sub.captured_at, image_url: deps.storage.publicUrl(s.sub.image_path),
    fields: s.fields, confidence: s.extraction.confidence, low_confidence: s.lowConfidence,
    verified: s.verified, confirmed_by_observer: s.extraction.confirmed_values !== null, checks: s.checks,
  }));
  const timeline = (await deps.db.listAuditEvents([u.unit.id, ...u.submissions.map((s) => s.sub.id)])).map((e) => ({
    type: e.type, subject_id: e.subject_id, created_at: e.created_at, payload: e.payload, prev_hash: e.prev_hash, hash: e.hash,
  }));
  const review_notes = (await deps.db.listReviewsForUnit(u.unit.id)).map((r) => ({ decision: r.decision, note: r.note, created_at: r.created_at }));
  const { id, code, name, ward, lga, state } = u.unit;
  return {
    unit: { id, code, name, ward, lga, state },
    status: u.status as Status,
    submissions: subs,
    pending: u.pending,
    comparison: u.comparison as Comparison | null,
    review_notes,
    timeline,
  };
}

const EMPTY_FIELDS: ResultFields = { registered: null, accredited: null, parties: {}, valid: null, rejected: null, cast: null };

/** Plain-language text for Listen and easy-read. Built from verified fields and the status only. */
export async function unitNarration(deps: Deps, unitId: string, lang: string) {
  if (lang !== "en" && lang !== "pcm") throw new HttpError(400, "lang must be en or pcm.");
  const u = await loadUnit(deps, unitId);
  const text = narrate(
    {
      fields: u.submissions[0]?.fields ?? EMPTY_FIELDS,
      status: u.status,
      differingFields: u.comparison?.differences.map((d) => d.field) ?? [],
    },
    lang as Language,
  );
  return { lang, status: u.status, text };
}
