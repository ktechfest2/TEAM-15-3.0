import { compareSubmissions, statusFor, validateArithmetic } from "@voteguard/evidence";
import { LOW_CONFIDENCE_THRESHOLD } from "@voteguard/extraction";
import type { ArithmeticCheck, Comparison, ResultFields, Status, SubmissionEvidence } from "@voteguard/shared";
import { appendAudit } from "./audit";
import { HttpError, type Deps, type ExtractionRow, type SubmissionRow, type UnitRow } from "./ports";

export interface LoadedSubmission {
  sub: SubmissionRow;
  extraction: ExtractionRow;
  fields: ResultFields;
  checks: ArithmeticCheck[];
  verified: boolean;
  lowConfidence: boolean;
  evidence: SubmissionEvidence;
}

export interface LoadedUnit {
  unit: UnitRow;
  submissions: LoadedSubmission[];
  /** Photos uploaded but not yet extracted. */
  pending: number;
  reviewed: boolean;
  status: Status;
  comparison: Comparison | null;
}

/** Derive everything about a unit from stored records. Checks are recomputed, never trusted from a client. */
export async function loadUnit(deps: Deps, unitId: string): Promise<LoadedUnit> {
  const unit = await deps.db.getUnit(unitId);
  if (!unit) throw new HttpError(404, "Unknown polling unit.");
  const subs = await deps.db.listSubmissionsForUnit(unitId);
  const submissions: LoadedSubmission[] = [];
  for (const sub of subs) {
    const extraction = await deps.db.getExtraction(sub.id);
    if (!extraction) continue;
    const confirmed = extraction.confirmed_values;
    const fields = confirmed ?? extraction.machine_values;
    const result = validateArithmetic(fields);
    const verified = result.ok && sub.hash_match !== false;
    const lowConfidence = confirmed ? false : Object.values(extraction.confidence).some((c) => c < LOW_CONFIDENCE_THRESHOLD);
    submissions.push({
      sub, extraction, fields, checks: result.checks, verified, lowConfidence,
      evidence: { submitterId: sub.submitter_id, sha256: sub.sha256_server ?? sub.sha256_client, fields, verified, lowConfidence },
    });
  }
  const reviewed = (await deps.db.listReviewsForUnit(unitId)).length > 0;
  const status = statusFor({ submissions: submissions.map((s) => s.evidence), reviewed });
  let comparison: Comparison | null = null;
  for (let i = 0; i < submissions.length && !comparison; i++) {
    for (let j = i + 1; j < submissions.length; j++) {
      const c = compareSubmissions(submissions[i]!.evidence, submissions[j]!.evidence);
      if (c.independent) { comparison = c; break; }
    }
  }
  return { unit, submissions, pending: subs.length - submissions.length, reviewed, status, comparison };
}

/** Persist the new status for every extracted photo of the unit and audit the change, if there was one. */
export async function recordStatus(deps: Deps, before: Status, after: LoadedUnit): Promise<void> {
  for (const s of after.submissions) {
    await deps.db.upsertVerification({ submission_id: s.sub.id, ok: s.verified, checks: s.checks, status: after.status });
  }
  if (before !== after.status) {
    await appendAudit(deps, {
      type: "status.changed", subject_id: after.unit.id, created_at: deps.now(),
      payload: { from: before, to: after.status },
    });
  }
}
