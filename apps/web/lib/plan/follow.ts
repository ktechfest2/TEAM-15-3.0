import type { Status } from "@voteguard/shared";
import { STATUSES } from "../status-copy";

export type Followed = Record<string, { status: Status }>;
export const FOLLOW_KEY = "voteguard.followed";

const isStatus = (v: unknown): v is Status => typeof v === "string" && (STATUSES as string[]).includes(v);

/** Read saved follows defensively: anything odd is dropped. */
export function parseFollowed(raw: string | null): Followed {
  let v: unknown;
  try { v = raw ? JSON.parse(raw) : null; } catch { return {}; }
  if (v === null || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Followed = {};
  for (const [code, e] of Object.entries(v as Record<string, unknown>)) {
    const s = (e as { status?: unknown } | null)?.status;
    if (isStatus(s)) out[code] = { status: s };
  }
  return out;
}

export function toggleFollow(f: Followed, code: string, status: Status): Followed {
  if (code in f) { const { [code]: _gone, ...rest } = f; return rest; }
  return { ...f, [code]: { status } };
}

/** What changed since the unit was last looked at, or null if nothing did (or it is not followed). */
export function whatChanged(f: Followed, code: string, now: Status): { from: Status; to: Status } | null {
  const e = f[code];
  if (!e || e.status === now) return null;
  return { from: e.status, to: now };
}

/** Remember the status that has just been shown, so the same change is not announced twice. */
export function rememberStatus(f: Followed, code: string, now: Status): Followed {
  return code in f ? { ...f, [code]: { status: now } } : f;
}
