import { describe, it, expect } from "vitest";
import { verifyChain } from "@voteguard/evidence";
import { appendAudit } from "../../lib/server/audit";
import { authenticate, requireReviewer } from "../../lib/server/auth";
import { HttpError } from "../../lib/server/ports";
import { makeDeps, OBSERVER_1, REVIEWER } from "./fakes";

const input = (n: number) => ({ type: "t", subject_id: "s", payload: { n }, created_at: `2026-11-19T20:00:0${n}.000Z` });

describe("appendAudit", () => {
  it("links each event to the previous one so the chain verifies", async () => {
    const { deps, db } = makeDeps();
    await appendAudit(deps, input(1));
    await appendAudit(deps, input(2));
    await appendAudit(deps, input(3));
    expect(db.audit).toHaveLength(3);
    expect(db.audit[0]!.prev_hash).toBeNull();
    expect(db.audit[1]!.prev_hash).toBe(db.audit[0]!.hash);
    expect(await verifyChain(db.audit)).toEqual({ ok: true });
  });
  it("retries when another writer got in first (chain conflict)", async () => {
    const { deps, db } = makeDeps();
    db.conflictsToInject = 2;
    await appendAudit(deps, input(1));
    expect(db.audit).toHaveLength(1);
  });
  it("gives up with a 503 after repeated conflicts instead of looping forever", async () => {
    const { deps, db } = makeDeps();
    db.conflictsToInject = 99;
    await expect(appendAudit(deps, input(1))).rejects.toMatchObject({ status: 503 });
    expect(db.audit).toHaveLength(0);
  });
});

describe("authenticate", () => {
  it("accepts a valid bearer token", async () => {
    const { deps } = makeDeps();
    expect(await authenticate(deps, `Bearer ${OBSERVER_1.id}`)).toEqual(OBSERVER_1);
  });
  it.each([null, "", "Bearer ", "Basic abc", "Bearer unknown-token"])("rejects %j with 401", async (h) => {
    const { deps } = makeDeps();
    await expect(authenticate(deps, h)).rejects.toMatchObject({ status: 401 });
  });
  it("requireReviewer refuses observers with 403 and allows reviewers", () => {
    expect(() => requireReviewer(OBSERVER_1)).toThrowError(HttpError);
    try { requireReviewer(OBSERVER_1); } catch (e) { expect((e as HttpError).status).toBe(403); }
    expect(() => requireReviewer(REVIEWER)).not.toThrow();
  });
});
