import { sha256 } from "@voteguard/evidence";
import type { ArithmeticCheck, ResultFields, Status } from "@voteguard/shared";
import { appendAudit } from "./audit";
import { loadUnit, recordStatus, type LoadedSubmission } from "./evidence";
import { HttpError, type AuthUser, type Deps, type SubmissionRow } from "./ports";
import { changedFields, parseResultFields } from "./validate";

export interface ExtractionSummary {
  submission_id: string;
  polling_unit_id: string;
  image_url: string;
  hash_match: boolean;
  verified: boolean;
  low_confidence: boolean;
  low_fields: string[];
  status: Status;
  fields: ResultFields;
  confidence: Record<string, number>;
  checks: ArithmeticCheck[];
}

async function ownSubmission(deps: Deps, user: AuthUser, id: string, allowReviewer: boolean): Promise<SubmissionRow> {
  const sub = await deps.db.getSubmission(id);
  if (!sub) throw new HttpError(404, "Unknown submission.");
  if (sub.submitter_id !== user.id && !(allowReviewer && user.role === "reviewer")) throw new HttpError(403, "This is not your submission.");
  return sub;
}

function summarise(deps: Deps, s: LoadedSubmission, status: Status): ExtractionSummary {
  return {
    submission_id: s.sub.id, polling_unit_id: s.sub.polling_unit_id, image_url: deps.storage.publicUrl(s.sub.image_path), hash_match: s.sub.hash_match === true, verified: s.verified,
    low_confidence: s.lowConfidence, low_fields: s.lowFields, status, fields: s.fields, confidence: s.extraction.confidence, checks: s.checks,
  };
}

/**
 * Step 2 of capture, after the photo is in storage: re-hash the stored bytes on the server and
 * compare with the phone's fingerprint, read the figures, run the arithmetic checks, derive the
 * unit's status, and write an audit event for each step. Safe to call twice.
 */
export async function runExtraction(deps: Deps, user: AuthUser, submissionId: string): Promise<ExtractionSummary> {
  const sub = await ownSubmission(deps, user, submissionId, true);
  const unitBefore = await loadUnit(deps, sub.polling_unit_id);
  const done = unitBefore.submissions.find((s) => s.sub.id === sub.id);
  if (done) return summarise(deps, done, unitBefore.status);

  const bytes = await deps.storage.download(sub.image_path);
  if (!bytes) throw new HttpError(409, "The photo has not been uploaded yet.");

  const serverHash = await sha256(bytes);
  const match = serverHash === sub.sha256_client;
  await deps.db.setServerHash(sub.id, serverHash, match);
  await appendAudit(deps, {
    type: "submission.hash_checked", subject_id: sub.id, created_at: deps.now(),
    payload: { sha256_client: sub.sha256_client, sha256_server: serverHash, match },
  });
  if (!match) {
    await appendAudit(deps, {
      type: "submission.hash_mismatch", subject_id: sub.id, created_at: deps.now(),
      payload: { sha256_client: sub.sha256_client, sha256_server: serverHash },
    });
  }

  // Read the bytes we actually stored, not the client's claim about them.
  const read = await deps.extraction.extract({ sha256: serverHash, bytes });
  await deps.db.insertExtraction({ submission_id: sub.id, machine_values: read.fields, confidence: read.confidence });
  await appendAudit(deps, {
    type: "extraction.recorded", subject_id: sub.id, created_at: deps.now(),
    payload: { engine: read.engine, low_confidence: read.lowConfidence },
  });

  const after = await loadUnit(deps, sub.polling_unit_id);
  const mine = after.submissions.find((s) => s.sub.id === sub.id)!;
  await appendAudit(deps, {
    type: "verification.recorded", subject_id: sub.id, created_at: deps.now(),
    payload: { arithmetic_ok: mine.checks.every((c) => c.ok), failed_rules: mine.checks.filter((c) => !c.ok).map((c) => c.rule) },
  });
  await recordStatus(deps, unitBefore.status, after);
  return summarise(deps, mine, after.status);
}

/**
 * The observer confirms or fixes what was read. Their values are stored beside the machine read,
 * which is never overwritten. Checks and status are recomputed from the confirmed figures.
 */
export async function confirmExtraction(deps: Deps, user: AuthUser, submissionId: string, body: unknown) {
  const sub = await ownSubmission(deps, user, submissionId, false);
  const extraction = await deps.db.getExtraction(sub.id);
  if (!extraction) throw new HttpError(409, "Figures have not been read yet.");
  const values = parseResultFields(body);

  const before = await loadUnit(deps, sub.polling_unit_id);
  const previous = extraction.confirmed_values ?? extraction.machine_values;
  const changed = changedFields(previous, values);
  await deps.db.setConfirmedValues(extraction.id, values);
  await appendAudit(deps, {
    type: "extraction.confirmed", subject_id: sub.id, created_at: deps.now(),
    payload: { changed },
  });
  const after = await loadUnit(deps, sub.polling_unit_id);
  await recordStatus(deps, before.status, after);
  const mine = after.submissions.find((s) => s.sub.id === sub.id)!;
  return { submission_id: sub.id, changed_fields: changed.map((c) => c.field), verified: mine.verified, status: after.status };
}
