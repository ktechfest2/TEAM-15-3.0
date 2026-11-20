import { describe, it, expect } from "vitest";
import candRaw from "../../lib/data/candidates.json";
import covRaw from "../../lib/data/coverage.json";
import extrasRaw from "../../lib/data/candidate-extras.json";
import { loadExtras } from "../../lib/candidates/extras";
import { guideToRows, TABLES, type TableName } from "../../lib/guide/rows";
import { resolveGuide } from "../../lib/guide/remote";
import { loadCandidates } from "../../lib/candidates/data";
import { loadCoverage } from "../../lib/coverage/data";

const rows = guideToRows(candRaw, covRaw, extrasRaw);
const bundled = { candidates: loadCandidates(candRaw), coverage: loadCoverage(covRaw), extras: loadExtras(extrasRaw, loadCandidates(candRaw)) };

describe("loading the guide from the database with a bundled fallback", () => {
  it("uses the database rows when they load and validate", async () => {
    const edited = JSON.parse(JSON.stringify(rows)); edited.guide_races[0].election_date = "2027-01-23";
    const r = await resolveGuide(async (t: TableName) => edited[t], bundled);
    expect(r.source).toBe("database");
    expect(r.candidates.election).toBe("2027-01-23");
  });
  it("falls back to the bundled data when the database cannot be reached", async () => {
    const r = await resolveGuide(async () => { throw new Error("offline"); }, bundled);
    expect(r.source).toBe("bundled");
    expect(r.candidates).toEqual(bundled.candidates);
  });
  it("falls back when a table comes back empty or malformed", async () => {
    const r1 = await resolveGuide(async (t: TableName) => (t === "guide_candidates" ? [] : rows[t]), bundled);
    expect(r1.source).toBe("bundled");
    const r2 = await resolveGuide(async (t: TableName) => (t === "guide_articles" ? rows[t].map((a) => ({ ...a, url: "http://x.org" })) : rows[t]), bundled);
    expect(r2.source).toBe("bundled");
  });
  it("falls back when the database is too slow", async () => {
    const r = await resolveGuide(() => new Promise(() => {}), bundled, 20);
    expect(r.source).toBe("bundled");
  });
  it("still uses the database when only the new items and images tables are missing, and keeps the bundled ones", async () => {
    const r = await resolveGuide(async (t: TableName) => { if (t === "guide_candidate_items" || t === "guide_images") throw new Error("relation does not exist"); return rows[t]; }, bundled);
    expect(r.source).toBe("database");
    expect(r.extras).toEqual(bundled.extras);
  });
  it("falls back to the bundled items when the database items fail the checks", async () => {
    const bad = [{ id: "x", candidate_id: "nobody", kind: "publication", title: "t", url: "https://example.org", publisher: "p", publisher_type: "outlet", published_on: "2026-10-01", checked_on: "2026-11-20", opinion: false }];
    const r = await resolveGuide(async (t: TableName) => (t === "guide_candidate_items" ? bad : rows[t]) as never, bundled);
    expect(r.source).toBe("database");
    expect(r.extras).toEqual(bundled.extras);
  });
  it("asks for every guide table", async () => {
    const asked: string[] = [];
    await resolveGuide(async (t: TableName) => { asked.push(t); return rows[t]; }, bundled);
    expect(asked.sort()).toEqual([...TABLES].sort());
  });
});
