import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CachedExtractionAdapter } from "@voteguard/extraction";
import type { AuditEvent, Status } from "@voteguard/shared";
import {
  ChainConflictError, type Db, type Deps, type ExtractionRow, type ReviewRow,
  type Storage, type SubmissionRow, type UnitRow, type VerificationRow, type AuthUser,
} from "../../lib/server/ports";

export const OBSERVER_1: AuthUser = { id: "11111111-1111-4111-8111-111111111111", role: "observer" };
export const OBSERVER_2: AuthUser = { id: "22222222-2222-4222-8222-222222222222", role: "observer" };
export const REVIEWER: AuthUser = { id: "33333333-3333-4333-8333-333333333333", role: "reviewer" };
export const UNIT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const OTHER_UNIT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const SHEETS = resolve(__dirname, "../../../../public/sample-result-sheets");
export const sheet = (name: "sheet-a-clean" | "sheet-b-altered-figure" | "sheet-c-bad-arithmetic") =>
  new Uint8Array(readFileSync(`${SHEETS}/${name}.png`));

export class MemoryDb implements Db {
  units: UnitRow[] = [
    { id: UNIT_ID, code: "LA-IKJ-04-012", name: "Test Unit", ward: "Ward 04", lga: "Ikeja", state: "Lagos", published_figures: null },
    { id: OTHER_UNIT_ID, code: "KN-FAG-04-001", name: "Other Unit", ward: "Ward 04", lga: "Fagge", state: "Kano", published_figures: null },
  ];
  submissions: SubmissionRow[] = [];
  extractions: ExtractionRow[] = [];
  verifications = new Map<string, VerificationRow>();
  reviews: ReviewRow[] = [];
  audit: AuditEvent[] = [];
  private seq = 0;
  /** Test hook: make the next append fail with a chain conflict this many times. */
  conflictsToInject = 0;

  async listUnits() { return this.units; }
  async getUnit(id: string) { return this.units.find((u) => u.id === id) ?? null; }
  async insertSubmission(row: Parameters<Db["insertSubmission"]>[0]) {
    const full: SubmissionRow = { ...row, sha256_server: null, hash_match: null, received_at: "2026-11-19T20:00:00.000Z" };
    this.submissions.push(full);
    return full;
  }
  async getSubmission(id: string) { return this.submissions.find((s) => s.id === id) ?? null; }
  async listSubmissionsForUnit(unitId: string) { return this.submissions.filter((s) => s.polling_unit_id === unitId); }
  async setServerHash(id: string, sha256_server: string, hash_match: boolean) {
    const s = this.submissions.find((x) => x.id === id)!;
    s.sha256_server = sha256_server; s.hash_match = hash_match;
  }
  async insertExtraction(row: Parameters<Db["insertExtraction"]>[0]) {
    const full: ExtractionRow = { ...row, id: `ex-${++this.seq}`, created_at: "2026-11-19T20:00:00.000Z", confirmed_values: null };
    this.extractions.push(full);
    return full;
  }
  async getExtraction(submissionId: string) { return this.extractions.find((e) => e.submission_id === submissionId) ?? null; }
  async setConfirmedValues(id: string, values: ExtractionRow["machine_values"]) {
    this.extractions.find((e) => e.id === id)!.confirmed_values = values;
  }
  async upsertVerification(row: VerificationRow) { this.verifications.set(row.submission_id, row); }
  async getVerification(id: string) { return this.verifications.get(id) ?? null; }
  async insertReview(row: Parameters<Db["insertReview"]>[0]) {
    const full: ReviewRow = { ...row, id: `rv-${++this.seq}`, created_at: "2026-11-19T20:00:00.000Z" };
    this.reviews.push(full);
    return full;
  }
  async listReviewsForUnit(unitId: string) { return this.reviews.filter((r) => r.polling_unit_id === unitId); }
  async lastAuditEvent() { return this.audit[this.audit.length - 1] ?? null; }
  async appendAuditEvent(e: AuditEvent) {
    if (this.conflictsToInject > 0) { this.conflictsToInject--; throw new ChainConflictError("chain link mismatch"); }
    const last = this.audit[this.audit.length - 1] ?? null;
    if ((last?.hash ?? null) !== e.prev_hash) throw new ChainConflictError("chain link mismatch");
    this.audit.push(e);
  }
  async listAuditEvents(subjectIds: string[]) { return this.audit.filter((e) => subjectIds.includes(e.subject_id)); }
  async listAllAuditEvents() { return [...this.audit]; }
  async unitStatuses() {
    const out: Record<string, Status> = {};
    for (const [subId, v] of this.verifications) {
      const sub = this.submissions.find((x) => x.id === subId);
      if (sub) out[sub.polling_unit_id] = v.status as Status;
    }
    for (const r of this.reviews) out[r.polling_unit_id] = "reviewed";
    return out;
  }
}

export class MemoryStorage implements Storage {
  files = new Map<string, Uint8Array>();
  async createSignedUploadUrl(path: string) { return { path, token: `tok-${path}`, signedUrl: `https://storage.test/upload/${path}` }; }
  async download(path: string) { return this.files.get(path) ?? null; }
  publicUrl(path: string) { return `https://storage.test/public/${path}`; }
}

export function makeDeps(users: AuthUser[] = [OBSERVER_1, OBSERVER_2, REVIEWER]) {
  const db = new MemoryDb();
  const storage = new MemoryStorage();
  let n = 0;
  const deps: Deps = {
    db, storage,
    auth: { verify: async (t) => users.find((u) => u.id === t) ?? null },
    extraction: new CachedExtractionAdapter(),
    now: () => `2026-11-19T20:00:${String(n++ % 60).padStart(2, "0")}.000Z`,
    newId: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
  };
  return { deps, db, storage };
}
