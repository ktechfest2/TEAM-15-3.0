import { describe, it, expect } from "vitest";
import candRaw from "../../lib/data/candidates.json";
import covRaw from "../../lib/data/coverage.json";
import extrasRaw from "../../lib/data/candidate-extras.json";
import { loadExtras } from "../../lib/candidates/extras";
import { guideToRows, rowsToGuide, buildSeedSql, TABLES } from "../../lib/guide/rows";
import { loadCandidates } from "../../lib/candidates/data";
import { loadCoverage } from "../../lib/coverage/data";

const rows = guideToRows(candRaw, covRaw, extrasRaw);
const id0 = candRaw.candidates[0]!.id;
const sample = {
  items: [
    { id: "s1", candidateId: id0, kind: "speech", title: "A speech", url: "https://example.org/s", publisher: "The party", publisherType: "party", date: "2026-10-02", checkedOn: "2026-11-20", opinion: false, language: "English", occasion: "Rally", place: "Abuja", length: "12 min", excerpt: "It's opening words." },
    { id: "v1", candidateId: id0, kind: "video", title: "A video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", publisher: "A channel", publisherType: "outlet", date: "2026-10-03", checkedOn: "2026-11-20", opinion: true },
  ],
  photos: { [id0]: { url: "https://upload.wikimedia.org/a.jpg", pageUrl: "https://commons.wikimedia.org/wiki/File:A.jpg", author: "An author", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" } },
  logos: { [candRaw.candidates[0]!.party]: { url: "https://upload.wikimedia.org/l.png", pageUrl: "https://commons.wikimedia.org/wiki/File:L.png", author: "Someone", license: "Public domain", licenseUrl: "https://commons.wikimedia.org/wiki/Commons:Licensing" } },
};

describe("guide data as database rows", () => {
  it("has one row per candidate, party, outlet, story and article", () => {
    expect(rows.guide_candidates).toHaveLength(18);
    expect(rows.guide_not_named).toHaveLength(1);
    expect(rows.guide_races).toHaveLength(1);
    expect(rows.guide_parties.length).toBeGreaterThanOrEqual(19);
    expect(rows.guide_outlets).toHaveLength(covRaw.outlets.length);
    expect(rows.guide_stories).toHaveLength(covRaw.stories.length);
    expect(rows.guide_articles).toHaveLength(covRaw.stories.reduce((n, s) => n + s.articles.length, 0));
  });
  it("round-trips: rows give back exactly the same candidates and coverage the app already validates", () => {
    const back = rowsToGuide(rows);
    expect(loadCandidates(back.candidates)).toEqual(loadCandidates(candRaw));
    expect(loadCoverage(back.coverage)).toEqual(loadCoverage(covRaw));
  });
  it("round-trips even when rows arrive in a different order", () => {
    const shuffled = { ...rows, guide_candidates: [...rows.guide_candidates].reverse(), guide_articles: [...rows.guide_articles].reverse(), guide_outlets: [...rows.guide_outlets].reverse() };
    const back = rowsToGuide(shuffled);
    expect(loadCandidates(back.candidates)).toEqual(loadCandidates(candRaw));
    expect(loadCoverage(back.coverage)).toEqual(loadCoverage(covRaw));
  });
  it("carries reviewer answers with the reviewer and the date, and none are invented", () => {
    expect(rows.guide_article_checks).toEqual([]);
    const withAnswer = JSON.parse(JSON.stringify(covRaw));
    withAnswer.stories[0].articles[0].checks.names_sources = [{ reviewer: "reviewer-a", answer: "yes", on: "2026-11-20" }, { reviewer: "reviewer-b", answer: "no", on: "2026-11-20" }];
    const r = guideToRows(candRaw, withAnswer);
    expect(r.guide_article_checks).toHaveLength(2);
    expect(loadCoverage(rowsToGuide(r).coverage)).toEqual(loadCoverage(withAnswer));
  });
});

describe("candidate items and images as rows", () => {
  const r = guideToRows(candRaw, covRaw, sample);
  it("one row per item and per image", () => {
    expect(r.guide_candidate_items).toHaveLength(2);
    expect(r.guide_images).toHaveLength(2);
    expect(r.guide_images.map((i) => i.kind).sort()).toEqual(["logo", "photo"]);
  });
  it("round-trips exactly, including the quote and optional fields", () => {
    const back = rowsToGuide(r).extras;
    expect(loadExtras(back, loadCandidates(candRaw))).toEqual(loadExtras(sample, loadCandidates(candRaw)));
  });
  it("round-trips when rows arrive in a different order", () => {
    const back = rowsToGuide({ ...r, guide_candidate_items: [...r.guide_candidate_items].reverse(), guide_images: [...r.guide_images].reverse() }).extras;
    expect(loadExtras(back, loadCandidates(candRaw))).toEqual(loadExtras(sample, loadCandidates(candRaw)));
  });
  it("the bundled, still-empty file produces no rows and no invented items", () => {
    expect(rows.guide_candidate_items).toHaveLength(extrasRaw.items.length);
  });
  it("the seed escapes apostrophes in the quote", () => {
    expect(buildSeedSql(r)).toContain("It''s opening words.");
  });
});

describe("seed SQL", () => {
  const sql = buildSeedSql(rows);
  it("inserts into every guide table and only guide tables", () => {
    for (const t of TABLES) if (rows[t].length > 0) expect(sql).toContain(`insert into public.${t}`);
    const targets = [...sql.matchAll(/insert into public\.(\w+)/g)].map((m) => m[1]);
    for (const t of targets) expect(t).toMatch(/^guide_/);
  });
  it("is safe to run twice and never deletes or drops anything", () => {
    expect(sql).toMatch(/on conflict/i);
    expect(sql).not.toMatch(/\b(drop|truncate|delete|alter)\b/i);
  });
  it("escapes apostrophes in text such as N'Assembly", () => {
    expect(sql).toContain("N''Assembly");
    expect(sql).not.toMatch(/[^'']N'Assembly/);
  });
  it("is one transaction", () => {
    expect(sql.trim().startsWith("begin;")).toBe(true);
    expect(sql.trim().endsWith("commit;")).toBe(true);
  });
});
