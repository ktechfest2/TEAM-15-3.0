import type { ResultFields, SubmissionEvidence } from "@voteguard/shared";

export const cleanFields: ResultFields = {
  registered: 520,
  accredited: 310,
  parties: { "Party A": 112, "Party B": 98, "Party C": 31 },
  valid: 241,
  rejected: 9,
  cast: 250,
};

export function sub(over: Partial<SubmissionEvidence> = {}): SubmissionEvidence {
  return {
    submitterId: "obs-1",
    sha256: "aaa",
    fields: cleanFields,
    verified: true,
    lowConfidence: false,
    ...over,
  };
}
