import { describe, it, expect } from "vitest";
import { sha256, verifyChain } from "@voteguard/evidence";
import { createUpload } from "../../lib/server/uploads";
import { runExtraction } from "../../lib/server/extract";
import { listUnits, unitEvidence, unitNarration } from "../../lib/server/read";
import { createReview } from "../../lib/server/reviews";
import { makeDeps, sheet, OBSERVER_1, OBSERVER_2, REVIEWER, UNIT_ID, OTHER_UNIT_ID } from "./fakes";

async function submit(ctx: ReturnType<typeof makeDeps>, user: typeof OBSERVER_1, name: Parameters<typeof sheet>[0]) {
  const bytes = sheet(name);
  const up = await createUpload(ctx.deps, user, { polling_unit_id: UNIT_ID, sha256: await sha256(bytes), captured_at: "2026-11-19T19:55:00.000Z", content_type: "image/png" });
  ctx.storage.files.set(up.path, bytes);
  await runExtraction(ctx.deps, user, up.submission_id);
  return up.submission_id;
}

describe("listUnits", () => {
  it("filters by state, lga, ward and a code-or-name search", async () => {
    const { deps } = makeDeps();
    expect((await listUnits(deps, {})).map((u) => u.code).sort()).toEqual(["KN-FAG-04-001", "LA-IKJ-04-012"]);
    expect(await listUnits(deps, { state: "Kano" })).toHaveLength(1);
    expect(await listUnits(deps, { lga: "Ikeja", ward: "Ward 04" })).toHaveLength(1);
    expect(await listUnits(deps, { q: "other" })).toHaveLength(1);
    expect(await listUnits(deps, { q: "012" })).toHaveLength(1);
    expect(await listUnits(deps, { q: "no-such-thing" })).toEqual([]);
  });
});

describe("unitEvidence", () => {
  it("is waiting for review with no photos", async () => {
    const { deps } = makeDeps();
    const ev = await unitEvidence(deps, UNIT_ID);
    expect(ev.status).toBe("waiting_for_review");
    expect(ev.submissions).toEqual([]);
    expect(ev.comparison).toBeNull();
  });
  it("404s for an unknown unit", async () => {
    const { deps } = makeDeps();
    await expect(unitEvidence(deps, OTHER_UNIT_ID.replace("b", "c"))).rejects.toMatchObject({ status: 404 });
  });
  it("shows a disputed unit with the differing field, photos, checks and a verifiable timeline", async () => {
    const ctx = makeDeps();
    await submit(ctx, OBSERVER_1, "sheet-a-clean");
    await submit(ctx, OBSERVER_2, "sheet-b-altered-figure");
    const ev = await unitEvidence(ctx.deps, UNIT_ID);
    expect(ev.status).toBe("disputed");
    expect(ev.submissions).toHaveLength(2);
    expect(ev.comparison!.independent).toBe(true);
    expect(ev.comparison!.differences.length).toBeGreaterThan(0);
    expect(ev.submissions[0]!.image_url).toMatch(/^https:\/\/storage\.test\/public\//);
    expect(ev.submissions[0]!.checks.length).toBeGreaterThan(0);
    expect(ev.timeline.length).toBeGreaterThan(4);
    expect(await verifyChain(ctx.db.audit)).toEqual({ ok: true });
  });
  it("never exposes who submitted or who reviewed", async () => {
    const ctx = makeDeps();
    await submit(ctx, OBSERVER_1, "sheet-a-clean");
    await createReview(ctx.deps, REVIEWER, { polling_unit_id: UNIT_ID, decision: "leave_open", note: "Looking at it." });
    const json = JSON.stringify(await unitEvidence(ctx.deps, UNIT_ID));
    for (const id of [OBSERVER_1.id, REVIEWER.id]) expect(json).not.toContain(id);
    expect(json).not.toMatch(/submitter|reviewer_id/);
  });
  it("uses the observer-confirmed figures when present", async () => {
    const ctx = makeDeps();
    const id = await submit(ctx, OBSERVER_1, "sheet-c-bad-arithmetic");
    const before = await unitEvidence(ctx.deps, UNIT_ID);
    expect(before.submissions[0]!.verified).toBe(false);
    const ex = ctx.db.extractions[0]!;
    ex.confirmed_values = { ...ex.machine_values, cast: (ex.machine_values.valid ?? 0) + (ex.machine_values.rejected ?? 0) };
    const after = await unitEvidence(ctx.deps, UNIT_ID);
    expect(after.submissions[0]!.fields.cast).toBe(ex.confirmed_values.cast);
    expect(id).toBeTruthy();
  });
});

describe("unitNarration", () => {
  it("narrates the status in plain English and Pidgin without saying correct, fraud or winner", async () => {
    const ctx = makeDeps();
    await submit(ctx, OBSERVER_1, "sheet-a-clean");
    await submit(ctx, OBSERVER_2, "sheet-b-altered-figure");
    for (const lang of ["en", "pcm"] as const) {
      const n = await unitNarration(ctx.deps, UNIT_ID, lang);
      expect(n.lang).toBe(lang);
      expect(n.status).toBe("disputed");
      expect(n.text.length).toBeGreaterThan(20);
      expect(n.text.toLowerCase()).not.toMatch(/\b(correct|fraud|winner|won)\b/);
    }
  });
  it("rejects an unknown language with 400", async () => {
    const { deps } = makeDeps();
    await expect(unitNarration(deps, UNIT_ID, "fr")).rejects.toMatchObject({ status: 400 });
  });
});

describe("createReview", () => {
  const body = { polling_unit_id: UNIT_ID, decision: "matches_1", note: "Photo 1 matches the posted sheet." };
  it("lets a reviewer decide; the unit becomes 'reviewed' and the decision is audited", async () => {
    const ctx = makeDeps();
    await submit(ctx, OBSERVER_1, "sheet-a-clean");
    await submit(ctx, OBSERVER_2, "sheet-b-altered-figure");
    await createReview(ctx.deps, REVIEWER, body);
    expect((await unitEvidence(ctx.deps, UNIT_ID)).status).toBe("reviewed");
    expect(ctx.db.reviews).toHaveLength(1);
    expect(ctx.db.reviews[0]!.reviewer_id).toBe(REVIEWER.id);
    const types = ctx.db.audit.map((e) => e.type);
    expect(types).toContain("review.recorded");
    expect(ctx.db.audit.filter((e) => e.type === "status.changed").pop()!.payload).toMatchObject({ from: "disputed", to: "reviewed" });
    expect((await unitEvidence(ctx.deps, UNIT_ID)).review_notes[0]).toMatchObject({ decision: "matches_1", note: body.note });
  });
  it("refuses observers (that check belongs to the handler as well as the database)", async () => {
    const ctx = makeDeps();
    await expect(createReview(ctx.deps, OBSERVER_1, body)).rejects.toMatchObject({ status: 403 });
    expect(ctx.db.reviews).toHaveLength(0);
  });
  it.each([
    ["bad decision", { ...body, decision: "fraud_confirmed" }],
    ["empty note", { ...body, note: "   " }],
    ["note too long", { ...body, note: "x".repeat(501) }],
    ["unknown unit id format", { ...body, polling_unit_id: "x" }],
    ["not an object", 5],
  ])("rejects %s", async (_n, b) => {
    const ctx = makeDeps();
    await expect(createReview(ctx.deps, REVIEWER, b)).rejects.toMatchObject({ status: 400 });
  });
  it("404s for a unit that does not exist", async () => {
    const ctx = makeDeps();
    await expect(createReview(ctx.deps, REVIEWER, { ...body, polling_unit_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" })).rejects.toMatchObject({ status: 404 });
  });
});
