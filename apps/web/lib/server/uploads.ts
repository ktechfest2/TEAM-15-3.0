import { appendAudit } from "./audit";
import { HttpError, type AuthUser, type Deps } from "./ports";
import { asObject, isSha256Hex, isUuid } from "./validate";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const CLOCK_SKEW_MS = 5 * 60 * 1000;

export interface UploadResult {
  submission_id: string;
  path: string;
  token: string;
  signed_url: string;
}

/**
 * Step 1 of capture: the phone has hashed the photo on-device and tells us the fingerprint.
 * We record the submission, then hand back a one-time signed URL for the bucket. The storage
 * path is built here (never taken from the client) and holds no user id, because the bucket is public.
 */
export async function createUpload(deps: Deps, user: AuthUser, body: unknown): Promise<UploadResult> {
  const b = asObject(body);
  if (!isUuid(b.polling_unit_id)) throw new HttpError(400, "polling_unit_id must be a UUID.");
  if (!isSha256Hex(b.sha256)) throw new HttpError(400, "sha256 must be 64 lowercase hex characters.");
  const ext = typeof b.content_type === "string" ? EXT[b.content_type] : undefined;
  if (!ext) throw new HttpError(400, "content_type must be image/jpeg, image/png or image/webp.");
  const captured = typeof b.captured_at === "string" ? Date.parse(b.captured_at) : NaN;
  if (Number.isNaN(captured)) throw new HttpError(400, "captured_at must be a date and time.");
  if (captured > Date.parse(deps.now()) + CLOCK_SKEW_MS) throw new HttpError(400, "captured_at is in the future.");

  const unit = await deps.db.getUnit(b.polling_unit_id);
  if (!unit) throw new HttpError(404, "Unknown polling unit.");

  const id = deps.newId();
  const path = `${id}.${ext}`; // no user id: the bucket is public and submitters are pseudonymous
  await deps.db.insertSubmission({
    id, polling_unit_id: unit.id, submitter_id: user.id, source_type: "independent",
    image_path: path, sha256_client: b.sha256, captured_at: new Date(captured).toISOString(),
  });
  await appendAudit(deps, {
    type: "submission.fingerprinted", subject_id: id, created_at: deps.now(),
    payload: { polling_unit_id: unit.id, sha256_client: b.sha256, captured_at: new Date(captured).toISOString() },
  });
  const signed = await deps.storage.createSignedUploadUrl(path);
  return { submission_id: id, path, token: signed.token, signed_url: signed.signedUrl };
}
