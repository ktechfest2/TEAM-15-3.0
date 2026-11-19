import { chainAuditEvent } from "@voteguard/evidence";
import type { AuditEvent, AuditEventInput } from "@voteguard/shared";
import { ChainConflictError, HttpError, type Deps } from "./ports";

const MAX_ATTEMPTS = 4;

/**
 * Append one event to the hash chain. The database refuses a bad link, so if another
 * writer got in first we re-read the chain end and try again, a few times only.
 */
export async function appendAudit(deps: Deps, input: AuditEventInput): Promise<AuditEvent> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const prev = await deps.db.lastAuditEvent();
    const event = await chainAuditEvent(prev, input);
    try {
      await deps.db.appendAuditEvent(event);
      return event;
    } catch (e) {
      if (!(e instanceof ChainConflictError)) throw e;
    }
  }
  throw new HttpError(503, "The audit log is busy. Please try again.");
}
