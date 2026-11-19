import { describe, it, expect } from "vitest";
import { sha256, verifyChain } from "@voteguard/evidence";
import { CachedExtractionAdapter } from "@voteguard/extraction";
import { createUpload } from "../../lib/server/uploads";
import { runExtraction, confirmExtraction } from "../../lib/server/extract";
import { makeDeps, sheet, OBSERVER_1, OBSERVER_2, REVIEWER, UNIT_ID } from "./fakes";

async function upload(ctx: ReturnType<typeof makeDeps>, user = OBSERVER_1, bytes = sheet("sheet-a-clean"), claimed?: string) {
  const hash = claimed ?? (await sha256(bytes));
  const up = await createUpload(ctx.deps, user, { polling_unit_id: UNIT_ID, sha256: hash, captured_at: "2026-11-19T19:55:00.000Z", content_type: "image/png" });
  ctx.storage.files.set(up.path, bytes);
  return up.submission_id;
}

describe("runExtraction", () => {
  it("re-hashes the stored image, extracts, validates and audits a clean sheet", async () => {
    const ctx = makeDeps();
    const id = await upload(ctx);
    const res = await runExtraction(ctx.deps, OBSERVER_1, id);
    expect(res.hash_match).toBe(true);
    expect(res.verified).toBe(true);
    expect(res.status).toBe("waiting_for_review");
    expect(ctx.db.submissions[0]!.sha256_server).toBe(await sha256(sheet("sheet-a-clean")));
    expect(ctx.db.extractions).toHaveLength(1);
    expect(ctx.db.verifications.get(id)!.ok).toBe(true);
    const types = ctx.db.audit.map((e) => e.type);
    expect(types).toEqual(["submission.fingerprinted", "submission.hash_checked", "extraction.recorded", "verification.recorded"]);
    expect(await verifyChain(ctx.db.audit)).toEqual({ ok: true });
  });

  it("flags a hash mismatch, audits it, and routes to human review", async () => {
    const ctx = makeDeps();
    const id = await upload(ctx, OBSERVER_1, sheet("sheet-a-clean"), "f".repeat(64));
    const res = await runExtraction(ctx.deps, OBSERVER_1, id);
    expect(res.hash_match).toBe(false);
    expect(res.status).toBe("needs_human_review");
    expect(ctx.db.submissions[0]!.hash_match).toBe(false);
    expect(ctx.db.audit.map((e) => e.type)).toContain("submission.hash_mismatch");
    // the extraction is keyed by the REAL stored bytes, not the client's claim
    expect(ctx.db.submissions[0]!.sha256_server).toBe(await sha256(sheet("sheet-a-clean")));
  });

  it("sends a sheet that fails arithmetic to human review", async () => {
    const ctx = makeDeps();
    const id = await upload(ctx, OBSERVER_1, sheet("sheet-c-bad-arithmetic"));
    const res = await runExtraction(ctx.deps, OBSERVER_1, id);
    expect(res.verified).toBe(false);
    expect(res.status).toBe("needs_human_review");
  });

  it("flags an image it does not recognise as unreadable for human review, never a guess", async () => {
    const ctx = makeDeps();
    const id = await upload(ctx, OBSERVER_1, new Uint8Array([1, 2, 3, 4]));
    const res = await runExtraction(ctx.deps, OBSERVER_1, id);
    expect(res.low_confidence).toBe(true);
    expect(res.low_fields.length).toBeGreaterThan(0);
    expect(res.status).toBe("needs_human_review");
    expect(Object.values(res.fields.parties).every((v) => v === null)).toBe(true);
  });

  it("is idempotent: running twice does not duplicate the extraction or the audit trail", async () => {
    const ctx = makeDeps();
    const id = await upload(ctx);
    await runExtraction(ctx.deps, OBSERVER_1, id);
    const auditCount = ctx.db.audit.length;
    const again = await runExtraction(ctx.deps, OBSERVER_1, id);
    expect(again.hash_match).toBe(true);
    expect(ctx.db.extractions).toHaveLength(1);
    expect(ctx.db.audit).toHaveLength(auditCount);
  });

  it("409s when the image has not been uploaded yet", async () => {
    const ctx = makeDeps();
    const id = await upload(ctx);
    ctx.storage.files.clear();
    await expect(runExtraction(ctx.deps, OBSERVER_1, id)).rejects.toMatchObject({ status: 409 });
  });

  it("404s for an unknown submission and 403s for someone else's; reviewers may run any", async () => {
    const ctx = makeDeps();
    const id = await upload(ctx);
    await expect(runExtraction(ctx.deps, OBSERVER_1, "dddddddd-dddd-4ddd-8ddd-dddddddddddd")).rejects.toMatchObject({ status: 404 });
    await expect(runExtraction(ctx.deps, OBSERVER_2, id)).rejects.toMatchObject({ status: 403 });
    await expect(runExtraction(ctx.deps, REVIEWER, id)).resolves.toBeTruthy();
  });

  it("the same file from two senders is one photo, so it cannot agree with itself", async () => {
    const ctx = makeDeps();
    await runExtraction(ctx.deps, OBSERVER_1, await upload(ctx, OBSERVER_1, sheet("sheet-a-clean")));
    const res = await runExtraction(ctx.deps, OBSERVER_2, await upload(ctx, OBSERVER_2, sheet("sheet-a-clean")));
    expect(res.status).toBe("waiting_for_review");
  });

  it("two independent photos with different figures are disputed, and the change is audited", async () => {
    const ctx = makeDeps();
    await runExtraction(ctx.deps, OBSERVER_1, await upload(ctx, OBSERVER_1, sheet("sheet-a-clean")));
    const res = await runExtraction(ctx.deps, OBSERVER_2, await upload(ctx, OBSERVER_2, sheet("sheet-b-altered-figure")));
    expect(res.status).toBe("disputed");
    const change = ctx.db.audit.filter((e) => e.type === "status.changed").pop()!;
    expect(change.payload).toMatchObject({ from: "waiting_for_review", to: "disputed" });
    expect(change.subject_id).toBe(UNIT_ID);
  });

  it("two independent photos with identical figures mean 'two people agree'", async () => {
    const ctx = makeDeps();
    const base = new CachedExtractionAdapter();
    // a different file (different hash) that reads to the same figures as sheet A
    const twin = new Uint8Array([9, 9, 9, 9]);
    ctx.deps.extraction = {
      extract: async (i) => (i.sha256 === (await sha256(twin)) ? base.extract({ sha256: await sha256(sheet("sheet-a-clean")) }) : base.extract(i)),
    };
    await runExtraction(ctx.deps, OBSERVER_1, await upload(ctx, OBSERVER_1, sheet("sheet-a-clean")));
    const res = await runExtraction(ctx.deps, OBSERVER_2, await upload(ctx, OBSERVER_2, twin));
    expect(res.status).toBe("two_people_agree");
  });
});

describe("confirmExtraction", () => {
  const fixed = (f: any) => ({ ...f });
  it("stores the observer's values apart from the machine read, re-validates, and audits", async () => {
    const ctx = makeDeps();
    const id = await upload(ctx, OBSERVER_1, sheet("sheet-c-bad-arithmetic"));
    const ran = await runExtraction(ctx.deps, OBSERVER_1, id);
    const machine = structuredClone(ctx.db.extractions[0]!.machine_values);
    const fixedValues = fixed({ ...machine, valid: machine.valid, cast: (machine.valid ?? 0) + (machine.rejected ?? 0) });
    const res = await confirmExtraction(ctx.deps, OBSERVER_1, id, fixedValues);
    expect(ctx.db.extractions[0]!.machine_values).toEqual(machine); // untouched
    expect(ctx.db.extractions[0]!.confirmed_values).toEqual(fixedValues);
    expect(res.changed_fields).toContain("cast");
    expect(ran.verified).toBe(false);
    expect(ctx.db.audit.map((e) => e.type)).toContain("extraction.confirmed");
  });
  it("only the submitter can confirm; reviewers cannot edit an observer's figures", async () => {
    const ctx = makeDeps();
    const id = await upload(ctx);
    await runExtraction(ctx.deps, OBSERVER_1, id);
    const values = ctx.db.extractions[0]!.machine_values;
    await expect(confirmExtraction(ctx.deps, OBSERVER_2, id, values)).rejects.toMatchObject({ status: 403 });
    await expect(confirmExtraction(ctx.deps, REVIEWER, id, values)).rejects.toMatchObject({ status: 403 });
  });
  it.each([
    ["not an object", "x"],
    ["negative-looking string number", { registered: "12" }],
    ["missing parties", { registered: 1, accredited: 1, valid: 1, rejected: 0, cast: 1 }],
    ["fractional", { registered: 1.5, accredited: 1, parties: {}, valid: 1, rejected: 0, cast: 1 }],
  ])("rejects malformed values: %s", async (_n, body) => {
    const ctx = makeDeps();
    const id = await upload(ctx);
    await runExtraction(ctx.deps, OBSERVER_1, id);
    await expect(confirmExtraction(ctx.deps, OBSERVER_1, id, body)).rejects.toMatchObject({ status: 400 });
  });
  it("409s if extraction has not run yet", async () => {
    const ctx = makeDeps();
    const id = await upload(ctx);
    await expect(confirmExtraction(ctx.deps, OBSERVER_1, id, {})).rejects.toMatchObject({ status: 409 });
  });
});
