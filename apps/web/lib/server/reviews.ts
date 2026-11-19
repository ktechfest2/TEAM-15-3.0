import { appendAudit } from "./audit";
import { requireReviewer } from "./auth";
import { loadUnit, recordStatus } from "./evidence";
import { HttpError, type AuthUser, type Deps, type ReviewRow } from "./ports";
import { asObject, isUuid } from "./validate";

const DECISIONS = ["matches_1", "matches_2", "request_new_photo", "leave_open"] as const;

/** A reviewer records a decision and a public note. The status becomes "reviewed". */
export async function createReview(deps: Deps, user: AuthUser, body: unknown) {
  requireReviewer(user);
  const b = asObject(body);
  if (!isUuid(b.polling_unit_id)) throw new HttpError(400, "polling_unit_id must be a UUID.");
  if (!DECISIONS.includes(b.decision as ReviewRow["decision"])) throw new HttpError(400, "Unknown decision.");
  const note = typeof b.note === "string" ? b.note.trim() : "";
  if (note.length === 0 || note.length > 500) throw new HttpError(400, "note must be 1 to 500 characters.");

  const before = await loadUnit(deps, b.polling_unit_id);
  const decision = b.decision as ReviewRow["decision"];
  await deps.db.insertReview({ polling_unit_id: before.unit.id, reviewer_id: user.id, decision, note });
  await appendAudit(deps, {
    type: "review.recorded", subject_id: before.unit.id, created_at: deps.now(),
    payload: { decision, note },
  });
  const after = await loadUnit(deps, before.unit.id);
  await recordStatus(deps, before.status, after);
  return { polling_unit_id: before.unit.id, status: after.status };
}
