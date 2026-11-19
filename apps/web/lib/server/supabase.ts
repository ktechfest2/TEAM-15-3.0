import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createExtractionAdapter } from "@voteguard/extraction";
import type { AuditEvent } from "@voteguard/shared";
import {
  ChainConflictError, type Auth, type Db, type Deps, type ExtractionRow, type ReviewRow,
  type Storage, type SubmissionRow, type UnitRow,
} from "./ports";

const BUCKET = "evidence";

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

function makeDb(c: SupabaseClient): Db {
  const auditRow = (r: any): AuditEvent => ({
    type: r.type, subject_id: r.subject_id, payload: r.payload, created_at: r.created_at, prev_hash: r.prev_hash, hash: r.hash,
  });
  return {
    async listUnits() {
      return must(await c.from("polling_units").select("id,code,name,ward,lga,state,published_figures").order("code"), "listUnits") as UnitRow[];
    },
    async getUnit(id) {
      return (must(await c.from("polling_units").select("id,code,name,ward,lga,state,published_figures").eq("id", id).maybeSingle(), "getUnit") as UnitRow | null) ?? null;
    },
    async insertSubmission(row) {
      return must(await c.from("submissions").insert(row).select().single(), "insertSubmission") as SubmissionRow;
    },
    async getSubmission(id) {
      return (must(await c.from("submissions").select("*").eq("id", id).maybeSingle(), "getSubmission") as SubmissionRow | null) ?? null;
    },
    async listSubmissionsForUnit(unitId) {
      return must(await c.from("submissions").select("*").eq("polling_unit_id", unitId).order("received_at"), "listSubmissionsForUnit") as SubmissionRow[];
    },
    async setServerHash(id, sha256_server, hash_match) {
      must(await c.from("submissions").update({ sha256_server, hash_match }).eq("id", id).select("id").single(), "setServerHash");
    },
    async insertExtraction(row) {
      return must(await c.from("extractions").insert(row).select().single(), "insertExtraction") as ExtractionRow;
    },
    async getExtraction(submissionId) {
      return (must(await c.from("extractions").select("*").eq("submission_id", submissionId).order("created_at", { ascending: false }).limit(1).maybeSingle(), "getExtraction") as ExtractionRow | null) ?? null;
    },
    async setConfirmedValues(extractionId, values) {
      must(await c.from("extractions").update({ confirmed_values: values }).eq("id", extractionId).select("id").single(), "setConfirmedValues");
    },
    async upsertVerification(row) {
      must(await c.from("verification_results").upsert(row).select("submission_id").single(), "upsertVerification");
    },
    async getVerification(id) {
      return must(await c.from("verification_results").select("*").eq("submission_id", id).maybeSingle(), "getVerification") ?? null;
    },
    async insertReview(row) {
      return must(await c.from("reviews").insert(row).select().single(), "insertReview") as ReviewRow;
    },
    async listReviewsForUnit(unitId) {
      return must(await c.from("reviews").select("*").eq("polling_unit_id", unitId).order("created_at"), "listReviewsForUnit") as ReviewRow[];
    },
    async lastAuditEvent() {
      const r = must(await c.from("audit_events").select("*").order("id", { ascending: false }).limit(1).maybeSingle(), "lastAuditEvent");
      return r ? auditRow(r) : null;
    },
    async appendAuditEvent(event) {
      const { error } = await c.rpc("append_audit_event", { p_event: event });
      if (!error) return;
      // The database function refuses a bad link; a duplicate hash means the same event raced in.
      if (/chain link mismatch/i.test(error.message) || error.code === "23505") throw new ChainConflictError(error.message);
      throw new Error(`appendAuditEvent: ${error.message}`);
    },
    async listAuditEvents(subjectIds) {
      if (subjectIds.length === 0) return [];
      return (must(await c.from("audit_events").select("*").in("subject_id", subjectIds).order("id"), "listAuditEvents") as any[]).map(auditRow);
    },
  };
}

function makeStorage(c: SupabaseClient): Storage {
  return {
    async createSignedUploadUrl(path) {
      const d = must(await c.storage.from(BUCKET).createSignedUploadUrl(path), "createSignedUploadUrl");
      return { path: d.path, token: d.token, signedUrl: d.signedUrl };
    },
    async download(path) {
      const { data, error } = await c.storage.from(BUCKET).download(path);
      if (error || !data) return null;
      return new Uint8Array(await data.arrayBuffer());
    },
    publicUrl(path) {
      return c.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    },
  };
}

function makeAuth(c: SupabaseClient): Auth {
  return {
    async verify(token) {
      if (!token) return null;
      const { data, error } = await c.auth.getUser(token);
      if (error || !data.user) return null;
      const profile = await c.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      return { id: data.user.id, role: profile.data?.role === "reviewer" ? "reviewer" : "observer" };
    },
  };
}

let cached: Deps | null = null;

/** Server-only wiring. Uses the service-role key, which must never reach the browser. */
export function getDeps(): Deps {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server is missing Supabase configuration.");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  cached = {
    db: makeDb(client),
    storage: makeStorage(client),
    auth: makeAuth(client),
    extraction: createExtractionAdapter({ mode: process.env.EXTRACTION_MODE === "live" ? "live" : "cached" }),
    now: () => new Date().toISOString(),
    newId: () => crypto.randomUUID(),
  };
  return cached;
}
