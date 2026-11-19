import { ApiError, type Api } from "./api";
import type { QueueItem } from "../queue";

export interface SyncPorts {
  api: Pick<Api, "units" | "createUpload" | "extract">;
  /** Put the file at the signed path. "exists" means a previous attempt already stored it. */
  putFile(path: string, token: string, bytes: ArrayBuffer, mimeType: string): Promise<"ok" | "exists">;
  update(id: string, patch: Partial<QueueItem>): Promise<void>;
  remove(id: string): Promise<void>;
}

/**
 * Send one queued capture to the server. Each step saves its progress on the queue item first,
 * so if the connection drops half way, the next try picks up where it stopped and never creates
 * a second submission for the same photo.
 */
export async function syncItem(item: QueueItem, p: SyncPorts): Promise<{ submissionId: string }> {
  let { submissionId, path, token } = item;
  if (!submissionId || !path || !token) {
    const found = await p.api.units({ q: item.unitCode });
    const unit = found.units.find((u) => u.code === item.unitCode);
    if (!unit) throw new Error(`The server does not know the unit ${item.unitCode}.`);
    const up = await p.api.createUpload({
      polling_unit_id: unit.id, sha256: item.sha256, captured_at: item.capturedAt, content_type: item.mimeType,
    });
    submissionId = up.submission_id; path = up.path; token = up.token;
    await p.update(item.id, { submissionId, path, token });
  }
  if (!item.uploaded) {
    await p.putFile(path, token, item.bytes, item.mimeType);
    await p.update(item.id, { uploaded: true });
  }
  await p.api.extract(submissionId);
  await p.remove(item.id);
  return { submissionId };
}

export interface SyncOutcome {
  id: string;
  ok: boolean;
  submissionId?: string;
  error?: string;
  needsSignIn?: boolean;
}

/** Sync items one by one. A failure on one does not block the rest; a 401 stops everything. */
export async function syncAll(items: QueueItem[], p: SyncPorts): Promise<SyncOutcome[]> {
  const out: SyncOutcome[] = [];
  for (const item of items) {
    try {
      const { submissionId } = await syncItem(item, p);
      out.push({ id: item.id, ok: true, submissionId });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        out.push({ id: item.id, ok: false, error: e.message, needsSignIn: true });
        break;
      }
      out.push({ id: item.id, ok: false, error: e instanceof Error ? e.message : "Upload failed." });
    }
  }
  return out;
}
