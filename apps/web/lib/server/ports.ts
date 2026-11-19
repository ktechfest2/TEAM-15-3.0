import type { AuditEvent, ResultFields, Status } from "@voteguard/shared";
import type { ExtractionAdapter } from "@voteguard/extraction";

export type Role = "observer" | "reviewer";
export interface AuthUser { id: string; role: Role }

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export interface UnitRow {
  id: string; code: string; name: string; ward: string; lga: string; state: string;
  published_figures: unknown | null;
}
export interface SubmissionRow {
  id: string; polling_unit_id: string; submitter_id: string; source_type: string;
  image_path: string; sha256_client: string; sha256_server: string | null;
  hash_match: boolean | null; captured_at: string; received_at: string;
}
export interface ExtractionRow {
  id: string; submission_id: string; machine_values: ResultFields;
  confidence: Record<string, number>; confirmed_values: ResultFields | null; created_at: string;
}
export interface VerificationRow {
  submission_id: string; ok: boolean; checks: unknown; status: string;
}
export interface ReviewRow {
  id: string; polling_unit_id: string; reviewer_id: string;
  decision: "matches_1" | "matches_2" | "request_new_photo" | "leave_open";
  note: string; created_at: string;
}

/** Thrown by appendAuditEvent when prev_hash no longer matches the end of the chain. */
export class ChainConflictError extends Error {}

export interface Db {
  listUnits(): Promise<UnitRow[]>;
  getUnit(id: string): Promise<UnitRow | null>;
  insertSubmission(row: Omit<SubmissionRow, "received_at" | "sha256_server" | "hash_match">): Promise<SubmissionRow>;
  getSubmission(id: string): Promise<SubmissionRow | null>;
  listSubmissionsForUnit(unitId: string): Promise<SubmissionRow[]>;
  setServerHash(id: string, sha256_server: string, hash_match: boolean): Promise<void>;
  insertExtraction(row: Omit<ExtractionRow, "id" | "created_at" | "confirmed_values">): Promise<ExtractionRow>;
  getExtraction(submissionId: string): Promise<ExtractionRow | null>;
  setConfirmedValues(extractionId: string, values: ResultFields): Promise<void>;
  upsertVerification(row: VerificationRow): Promise<void>;
  getVerification(submissionId: string): Promise<VerificationRow | null>;
  insertReview(row: Omit<ReviewRow, "id" | "created_at">): Promise<ReviewRow>;
  listReviewsForUnit(unitId: string): Promise<ReviewRow[]>;
  lastAuditEvent(): Promise<AuditEvent | null>;
  appendAuditEvent(event: AuditEvent): Promise<void>;
  listAuditEvents(subjectIds: string[]): Promise<AuditEvent[]>;
  /** The whole chain, oldest first. */
  listAllAuditEvents(): Promise<AuditEvent[]>;
  /** Stored status per unit id for units that have any activity. Units not listed are waiting for review. */
  unitStatuses(): Promise<Record<string, Status>>;
}

export interface Storage {
  createSignedUploadUrl(path: string): Promise<{ path: string; token: string; signedUrl: string }>;
  download(path: string): Promise<Uint8Array | null>;
  publicUrl(path: string): string;
}

export interface Auth {
  /** Verify a bearer token. null when the token is missing, invalid or expired. */
  verify(token: string | null): Promise<AuthUser | null>;
}

export interface Deps {
  db: Db;
  storage: Storage;
  auth: Auth;
  extraction: ExtractionAdapter;
  now: () => string;
  newId: () => string;
}
