import { describe, it, expect } from "vitest";
import { sha256 } from "@voteguard/evidence";
import { CachedExtractionAdapter } from "@voteguard/extraction";
import { createUpload } from "../../lib/server/uploads";
import { runExtraction } from "../../lib/server/extract";
import { listUnits } from "../../lib/server/read";
import { dashboard, sumFields } from "../../lib/server/rollup";
import { verifyAudit } from "../../lib/server/audit-verify";
import { makeDeps, sheet, OBSERVER_1, OBSERVER_2, UNIT_ID, OTHER_UNIT_ID } from "./fakes";

async function submit(ctx: ReturnType<typeof makeDeps>, user: typeof OBSERVER_1, name: Parameters<typeof sheet>[0], unit = UNIT_ID, bytes = sheet(name)) {
  const up = await createUpload(ctx.deps, user, { polling_unit_id: unit, sha256: await sha256(bytes), captured_at: "2026-11-19T19:55:00.000Z", content_type: "image/png" });
  ctx.storage.files.set(up.path, bytes);
  return runExtraction(ctx.deps, user, up.submission_id);
}

describe("listUnits with status", () => {
  it("gives each unit its current status, waiting for review when nothing has happened", async () => {
    const ctx = makeDeps();
    await submit(ctx, OBSERVER_1, "sheet-a-clean");
    await submit(ctx, OBSERVER_2, "sheet-b-altered-figure");
    const list = await listUnits(ctx.deps, {});
    expect(list.find((u) => u.id === UNIT_ID)!.status).toBe("disputed");
    expect(list.find((u) => u.id === OTHER_UNIT_ID)!.status).toBe("waiting_for_review");
  });
});

describe("sumFields", () => {
  it("adds figures and party votes across units", () => {
    const f = (n: number) => ({ registered: 10 * n, accredited: 5 * n, parties: { A: n, B: 2 * n }, valid: 3 * n, rejected: n, cast: 4 * n });
    expect(sumFields([f(1), f(2)])).toEqual({ registered: 30, accredited: 15, parties: { A: 3, B: 6 }, valid: 9, rejected: 3, cast: 12 });
  });
  it("is all zero for no units", () => {
    expect(sumFields([])).toEqual({ registered: 0, accredited: 0, parties: {}, valid: 0, rejected: 0, cast: 0 });
  });
});

describe("dashboard", () => {
  it("counts units by status overall and per ward", async () => {
    const ctx = makeDeps();
    await submit(ctx, OBSERVER_1, "sheet-a-clean");
    const d = await dashboard(ctx.deps);
    expect(d.totals.waiting_for_review).toBe(2);
    expect(d.units_total).toBe(2);
    const ward = d.wards.find((w) => w.ward === "Ward 04" && w.lga === "Ikeja")!;
    expect(ward.units_total).toBe(1);
    expect(ward.counts.waiting_for_review).toBe(1);
    expect(ward.counted_units).toBe(0);
  });
  it("sums only units where two people agree, and says it is not comparable until every unit is counted", async () => {
    const ctx = makeDeps();
    const base = new CachedExtractionAdapter();
    const twin = new Uint8Array([9, 9, 9, 9]);
    ctx.deps.extraction = { extract: async (i) => (i.sha256 === (await sha256(twin)) ? base.extract({ sha256: await sha256(sheet("sheet-a-clean")) }) : base.extract(i)) };
    await submit(ctx, OBSERVER_1, "sheet-a-clean");
    await submit(ctx, OBSERVER_2, "sheet-a-clean", UNIT_ID, twin);
    const d = await dashboard(ctx.deps);
    const ward = d.wards.find((w) => w.lga === "Ikeja")!;
    expect(ward.counts.two_people_agree).toBe(1);
    expect(ward.counted_units).toBe(1);
    expect(ward.counted!.valid).toBe(241);
  });
  it("does not count disputed units toward the sum", async () => {
    const ctx = makeDeps();
    await submit(ctx, OBSERVER_1, "sheet-a-clean");
    await submit(ctx, OBSERVER_2, "sheet-b-altered-figure");
    const ward = (await dashboard(ctx.deps)).wards.find((w) => w.lga === "Ikeja")!;
    expect(ward.counts.disputed).toBe(1);
    expect(ward.counted_units).toBe(0);
  });
  it("attaches the synthetic published ward figure and labels it as demo data", async () => {
    const ctx = makeDeps();
    ctx.db.units[0] = { ...ctx.db.units[0]!, ward: "Ward 04", lga: "Ikeja", state: "Lagos" };
    const ward = (await dashboard(ctx.deps)).wards.find((w) => w.lga === "Ikeja" && w.ward === "Ward 04")!;
    expect(ward.published).toMatchObject({ source: expect.stringMatching(/synthetic/i) });
    expect(ward.published!.valid).toBeGreaterThan(0);
    expect(ward.comparable).toBe(false);
  });
});

describe("verifyAudit", () => {
  it("reports ok with the event count and head hash", async () => {
    const ctx = makeDeps();
    await submit(ctx, OBSERVER_1, "sheet-a-clean");
    const v = await verifyAudit(ctx.deps);
    expect(v.ok).toBe(true);
    expect(v.count).toBe(ctx.db.audit.length);
    expect(v.head_hash).toBe(ctx.db.audit[ctx.db.audit.length - 1]!.hash);
  });
  it("is ok and empty when nothing has happened", async () => {
    expect(await verifyAudit(makeDeps().deps)).toMatchObject({ ok: true, count: 0, head_hash: null });
  });
  it("names the first broken event when the chain was tampered with", async () => {
    const ctx = makeDeps();
    await submit(ctx, OBSERVER_1, "sheet-a-clean");
    ctx.db.audit[1] = { ...ctx.db.audit[1]!, payload: { tampered: true } };
    const v = await verifyAudit(ctx.deps);
    expect(v).toMatchObject({ ok: false, broken_at: 1, reason: "bad_hash" });
  });
});
