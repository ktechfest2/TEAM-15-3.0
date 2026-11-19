import type { ExtractionSummary } from "../server/extract";
import type { UploadResult } from "../server/uploads";
import type { PublicUnit, UnitFilter, unitEvidence, unitNarration } from "../server/read";
import type { dashboard } from "../server/rollup";
import type { AuditVerification } from "../server/audit-verify";
import type { ResultFields, Status } from "@voteguard/shared";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export type EvidenceResponse = Awaited<ReturnType<typeof unitEvidence>>;
export type NarrationResponse = Awaited<ReturnType<typeof unitNarration>>;
export type DashboardResponse = Awaited<ReturnType<typeof dashboard>>;

export interface ApiOptions {
  fetch: typeof fetch;
  getToken: () => Promise<string | null>;
}

/** Thin typed wrapper over the app's own routes. Status 0 means the network is unavailable. */
export function createApi({ fetch: f, getToken }: ApiOptions) {
  async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const token = await getToken();
    const headers: Record<string, string> = {};
    if (token) headers.authorization = `Bearer ${token}`;
    if (body !== undefined) headers["content-type"] = "application/json";
    let res: Response;
    try {
      res = await f(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      throw new ApiError(0, "No connection.");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? "Something went wrong.");
    return data as T;
  }

  return {
    me: () => call<{ role: "observer" | "reviewer" }>("GET", "/api/me"),
    units(filter: UnitFilter) {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(filter)) if (v) q.set(k, v);
      const qs = q.toString();
      return call<{ units: PublicUnit[] }>("GET", `/api/units${qs ? `?${qs}` : ""}`);
    },
    evidence: (unitId: string) => call<EvidenceResponse>("GET", `/api/units/${unitId}/evidence`),
    narration: (unitId: string, lang: "en" | "pcm") => call<NarrationResponse>("GET", `/api/units/${unitId}/narration?lang=${lang}`),
    dashboard: () => call<DashboardResponse>("GET", "/api/dashboard"),
    audit: () => call<AuditVerification>("GET", "/api/audit"),
    createUpload: (body: { polling_unit_id: string; sha256: string; captured_at: string; content_type: string }) => call<UploadResult>("POST", "/api/uploads", body),
    extract: (submissionId: string) => call<ExtractionSummary>("POST", `/api/submissions/${submissionId}/extract`),
    confirm: (submissionId: string, values: ResultFields) => call<{ submission_id: string; changed_fields: string[]; verified: boolean; status: Status }>("POST", `/api/submissions/${submissionId}/confirm`, values),
    review: (body: { polling_unit_id: string; decision: string; note: string }) => call<{ polling_unit_id: string; status: Status }>("POST", "/api/reviews", body),
  };
}
export type Api = ReturnType<typeof createApi>;
