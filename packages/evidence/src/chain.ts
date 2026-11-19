import type { AuditEvent, AuditEventInput, ChainVerification } from "@voteguard/shared";
import { sha256 } from "./sha256";

/** JSON with sorted keys so the hash never depends on key order. */
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`)
    .join(",")}}`;
}

async function hashOf(input: AuditEventInput, prev_hash: string | null): Promise<string> {
  const body = canonical({
    type: input.type,
    subject_id: input.subject_id,
    payload: input.payload,
    created_at: input.created_at,
    prev_hash,
  });
  return sha256(new TextEncoder().encode(body));
}

/** Append an event: it stores the previous event's hash and its own hash. */
export async function chainAuditEvent(prev: AuditEvent | null, input: AuditEventInput): Promise<AuditEvent> {
  const prev_hash = prev ? prev.hash : null;
  return { ...input, prev_hash, hash: await hashOf(input, prev_hash) };
}

/** Recompute the whole chain; report the first event that does not fit. */
export async function verifyChain(events: AuditEvent[]): Promise<ChainVerification> {
  let prevHash: string | null = null;
  for (let i = 0; i < events.length; i++) {
    const e = events[i]!;
    if (e.prev_hash !== prevHash) return { ok: false, index: i, reason: "bad_link" };
    const { prev_hash: _p, hash: _h, ...input } = e;
    if ((await hashOf(input, e.prev_hash)) !== e.hash) return { ok: false, index: i, reason: "bad_hash" };
    prevHash = e.hash;
  }
  return { ok: true };
}
