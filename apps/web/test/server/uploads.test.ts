import { describe, it, expect } from "vitest";
import { createUpload } from "../../lib/server/uploads";
import { makeDeps, OBSERVER_1, UNIT_ID } from "./fakes";

const good = { polling_unit_id: UNIT_ID, sha256: "a".repeat(64), captured_at: "2026-11-19T19:55:00.000Z", content_type: "image/png" };

describe("createUpload (signed upload URL flow)", () => {
  it("records the fingerprint, returns a signed URL for a path with no user id in it, and audits it", async () => {
    const { deps, db } = makeDeps();
    const res = await createUpload(deps, OBSERVER_1, good);
    expect(res.path).toBe(`${res.submission_id}.png`);
    expect(res.path).not.toContain(OBSERVER_1.id);
    expect(res.signed_url).toContain(res.path);
    expect(db.submissions).toHaveLength(1);
    expect(db.submissions[0]).toMatchObject({ submitter_id: OBSERVER_1.id, sha256_client: good.sha256, polling_unit_id: UNIT_ID });
    expect(db.audit.map((e) => e.type)).toEqual(["submission.fingerprinted"]);
    expect(db.audit[0]!.subject_id).toBe(res.submission_id);
  });
  it("never lets the client choose the storage path or the submitter", async () => {
    const { deps, db } = makeDeps();
    await createUpload(deps, OBSERVER_1, { ...good, image_path: "../evil/x.png", submitter_id: "someone-else" });
    expect(db.submissions[0]!.submitter_id).toBe(OBSERVER_1.id);
    expect(db.submissions[0]!.image_path).not.toContain(OBSERVER_1.id);
    expect(db.submissions[0]!.image_path).not.toContain("/");
    expect(db.submissions[0]!.image_path).not.toContain("..");
  });
  it.each([
    ["non-object body", null],
    ["unknown polling unit", { ...good, polling_unit_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" }, 404],
    ["bad polling unit id", { ...good, polling_unit_id: "nope" }],
    ["short hash", { ...good, sha256: "abc" }],
    ["uppercase hash", { ...good, sha256: "A".repeat(64) }],
    ["unsupported type", { ...good, content_type: "application/pdf" }],
    ["bad date", { ...good, captured_at: "yesterday-ish" }],
    ["capture time in the future", { ...good, captured_at: "2030-01-01T00:00:00.000Z" }],
  ] as [string, unknown, number?][])("rejects %s", async (_n, body, status = 400) => {
    const { deps, db } = makeDeps();
    await expect(createUpload(deps, OBSERVER_1, body)).rejects.toMatchObject({ status });
    expect(db.submissions).toHaveLength(0);
    expect(db.audit).toHaveLength(0);
  });
});
