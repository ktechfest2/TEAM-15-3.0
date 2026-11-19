/** Shared types for VOTE-GUARD 360. All demo data is synthetic. */

export type PartyVotes = Record<string, number | null>;

/** Figures read from a polling-unit result sheet. null means missing or unreadable. */
export interface ResultFields {
  registered: number | null;
  accredited: number | null;
  parties: PartyVotes;
  valid: number | null;
  rejected: number | null;
  cast: number | null;
}

export type CheckRule =
  | "no_missing"
  | "no_negative"
  | "parties_sum_to_valid"
  | "valid_plus_rejected_equals_cast"
  | "cast_not_above_accredited"
  | "accredited_not_above_registered";

export interface ArithmeticCheck {
  rule: CheckRule;
  ok: boolean;
  message: string;
}

export interface VerificationResult {
  ok: boolean;
  checks: ArithmeticCheck[];
}

/** The only statuses the product may show. None asserts fraud, correctness or a winner. */
export type Status =
  | "waiting_for_review"
  | "needs_human_review"
  | "two_people_agree"
  | "disputed"
  | "reviewed";

export type SourceType = "official_public" | "independent" | "demo_synthetic";

export interface SubmissionEvidence {
  submitterId: string;
  /** SHA-256 hex of the stored image. */
  sha256: string;
  fields: ResultFields;
  /** Arithmetic checks passed. */
  verified: boolean;
  /** Any field below the confidence threshold. */
  lowConfidence: boolean;
}

export interface FieldDifference {
  field: string;
  a: number | null;
  b: number | null;
}

export interface Comparison {
  /** Different submitters AND different file hashes. */
  independent: boolean;
  agree: boolean;
  differences: FieldDifference[];
}

export interface AuditEventInput {
  type: string;
  subject_id: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface AuditEvent extends AuditEventInput {
  prev_hash: string | null;
  hash: string;
}

export type ChainVerification =
  | { ok: true }
  | { ok: false; index: number; reason: "bad_link" | "bad_hash" };

export type Language = "en" | "pcm";
