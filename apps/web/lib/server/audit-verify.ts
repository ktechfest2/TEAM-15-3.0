import { verifyChain } from "@voteguard/evidence";
import type { Deps } from "./ports";

export interface AuditVerification {
  ok: boolean;
  count: number;
  head_hash: string | null;
  broken_at?: number;
  reason?: "bad_link" | "bad_hash";
}

/** Recompute the whole audit chain from the first event. Public: anyone can check it. */
export async function verifyAudit(deps: Deps): Promise<AuditVerification> {
  const events = await deps.db.listAllAuditEvents();
  const result = await verifyChain(events);
  const head_hash = events.length ? events[events.length - 1]!.hash : null;
  if (result.ok) return { ok: true, count: events.length, head_hash };
  return { ok: false, count: events.length, head_hash, broken_at: result.index, reason: result.reason };
}
