import type { Status, SubmissionEvidence } from "@voteguard/shared";
import { compareSubmissions } from "./compare";

export interface StatusInput {
  submissions: SubmissionEvidence[];
  /** A reviewer has recorded a decision for this unit. */
  reviewed: boolean;
}

const flagged = (s: SubmissionEvidence) => !s.verified || s.lowConfidence;

/** Derive the one allowed status for a polling unit. No status asserts fraud, correctness or a winner. */
export function statusFor({ submissions, reviewed }: StatusInput): Status {
  if (reviewed) return "reviewed";
  if (submissions.length === 0) return "waiting_for_review";

  // Find any pair of independent submissions.
  let comparedPair: { agree: boolean; both: SubmissionEvidence[] } | null = null;
  for (let i = 0; i < submissions.length && !comparedPair; i++) {
    for (let j = i + 1; j < submissions.length; j++) {
      const a = submissions[i]!;
      const b = submissions[j]!;
      const c = compareSubmissions(a, b);
      if (c.independent) {
        comparedPair = { agree: c.agree, both: [a, b] };
        break;
      }
    }
  }

  if (comparedPair) {
    if (!comparedPair.agree) return "disputed";
    return comparedPair.both.some(flagged) ? "needs_human_review" : "two_people_agree";
  }
  return submissions.some(flagged) ? "needs_human_review" : "waiting_for_review";
}
