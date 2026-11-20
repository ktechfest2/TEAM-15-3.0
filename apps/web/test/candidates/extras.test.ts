import { describe, it, expect } from "vitest";
import candRaw from "../../lib/data/candidates.json";
import extrasRaw from "../../lib/data/candidate-extras.json";
import { loadCandidates } from "../../lib/candidates/data";
import { loadExtras, itemsFor, youtubeId, LIMITS, PUBLISHER_TYPES, imageFor } from "../../lib/candidates/extras";

const cands = loadCandidates(candRaw);
const first = cands.candidates[0]!;
const second = cands.candidates[1]!;

const item = (o: Record<string, unknown> = {}) => ({
  id: "i1", candidateId: first.id, kind: "publication", title: "A published piece", url: "https://example.org/a", publisher: "Example Press",
  publisherType: "outlet", date: "2026-10-01", checkedOn: "2026-11-20", opinion: false, ...o,
});
const file = (items: unknown[] = [], extra: Record<string, unknown> = {}) => ({ items, photos: {}, logos: {}, ...extra });

describe("candidate details: speeches, videos and publications", () => {
  it("has the same limits for every candidate: 3 speeches, 4 videos, 5 publications", () => {
    expect(LIMITS).toEqual({ speech: 3, video: 4, publication: 5 });
  });
  it("the bundled file loads against the INEC candidate list", () => {
    const e = loadExtras(extrasRaw, cands);
    for (const i of e.items) expect(cands.candidates.map((c) => c.id)).toContain(i.candidateId);
  });
  it("accepts a plain empty file, so every candidate can show 'None added yet'", () => {
    const e = loadExtras(file(), cands);
    for (const c of cands.candidates) expect(itemsFor(e, c.id)).toEqual({ speech: [], video: [], publication: [] });
  });
  it("every item says who published it, from a fixed list of kinds", () => {
    expect([...PUBLISHER_TYPES]).toEqual(["candidate", "party", "outlet", "official", "academic"]);
    expect(() => loadExtras(file([item({ publisherType: "blogger" })]), cands)).toThrow();
    expect(() => loadExtras(file([item({ publisher: "" })]), cands)).toThrow();
  });
  it("an item must belong to a candidate on INEC's list", () => {
    expect(() => loadExtras(file([item({ candidateId: "nobody" })]), cands)).toThrow(/candidate/);
  });
  it("links must be https, dates real, and an item needs the date we checked it", () => {
    expect(() => loadExtras(file([item({ url: "http://example.org" })]), cands)).toThrow();
    expect(() => loadExtras(file([item({ date: "last week" })]), cands)).toThrow();
    expect(() => loadExtras(file([item({ checkedOn: undefined })]), cands)).toThrow();
    expect(() => loadExtras(file([item({ title: " " })]), cands)).toThrow();
  });
  it("opinion must be stated, not left out", () => {
    expect(() => loadExtras(file([item({ opinion: undefined })]), cands)).toThrow();
  });
  it("refuses anything that ranks by popularity or says who is best", () => {
    for (const key of ["views", "likes", "rank", "score", "rating", "featured"]) expect(() => loadExtras(file([item({ [key]: 1 })]), cands)).toThrow();
  });
  it("a video must be a YouTube link with a video id", () => {
    expect(() => loadExtras(file([item({ kind: "video", url: "https://example.org/v" })]), cands)).toThrow(/YouTube/);
    const e = loadExtras(file([item({ kind: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" })]), cands);
    expect(itemsFor(e, first.id).video[0]!.videoId).toBe("dQw4w9WgXcQ");
  });
  it("finds the video id in the usual YouTube links, and nothing in other links", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://www.youtube.com/@somebody")).toBeNull();
    expect(youtubeId("https://evil.example/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(youtubeId("not a url")).toBeNull();
  });
  it("only a speech can quote its opening lines, and the quote is short", () => {
    expect(() => loadExtras(file([item({ excerpt: "Some opening words." })]), cands)).toThrow(/excerpt/);
    expect(() => loadExtras(file([item({ kind: "speech", excerpt: "x".repeat(301) })]), cands)).toThrow(/excerpt/);
    expect(loadExtras(file([item({ kind: "speech", excerpt: "Opening words." })]), cands).items[0]!.excerpt).toBe("Opening words.");
  });
  it("no candidate can have more than the limit, so nobody gets a longer page", () => {
    const six = Array.from({ length: 6 }, (_, n) => item({ id: `p${n}`, url: `https://example.org/${n}` }));
    expect(() => loadExtras(file(six), cands)).toThrow(/limit/);
    expect(() => loadExtras(file(six.slice(0, 5)), cands)).not.toThrow();
  });
  it("the limit is per candidate and per kind", () => {
    const a = Array.from({ length: 5 }, (_, n) => item({ id: `a${n}`, url: `https://example.org/a${n}` }));
    const b = Array.from({ length: 5 }, (_, n) => item({ id: `b${n}`, candidateId: second.id, url: `https://example.org/b${n}` }));
    expect(() => loadExtras(file([...a, ...b]), cands)).not.toThrow();
  });
  it("lists newest first, whatever the file order", () => {
    const e = loadExtras(file([item({ id: "old", date: "2026-01-01", url: "https://example.org/o" }), item({ id: "new", date: "2026-10-01", url: "https://example.org/n" })]), cands);
    expect(itemsFor(e, first.id).publication.map((i) => i.id)).toEqual(["new", "old"]);
  });
  it("ids are unique", () => {
    expect(() => loadExtras(file([item(), item({ url: "https://example.org/b" })]), cands)).toThrow(/duplicate/);
  });
});

describe("photos and party logos", () => {
  const img = (o: Record<string, unknown> = {}) => ({ url: "https://upload.wikimedia.org/x.jpg", pageUrl: "https://commons.wikimedia.org/wiki/File:X.jpg", author: "Someone", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", ...o });
  it("a photo needs its source page, author and licence on record", () => {
    for (const k of ["pageUrl", "author", "license", "licenseUrl"]) expect(() => loadExtras(file([], { photos: { [first.id]: img({ [k]: undefined }) } }), cands)).toThrow();
    const e = loadExtras(file([], { photos: { [first.id]: img() } }), cands);
    expect(imageFor(e.photos, first.id)?.license).toBe("CC BY-SA 4.0");
  });
  it("images load only from https, and photos only for candidates on the list", () => {
    expect(() => loadExtras(file([], { photos: { [first.id]: img({ url: "http://upload.wikimedia.org/x.jpg" }) } }), cands)).toThrow();
    expect(() => loadExtras(file([], { photos: { nobody: img() } }), cands)).toThrow(/candidate/);
  });
  it("logos only for parties on INEC's register", () => {
    expect(() => loadExtras(file([], { logos: { ZZZ: img() } }), cands)).toThrow(/party/);
    const code = first.party;
    expect(imageFor(loadExtras(file([], { logos: { [code]: img() } }), cands).logos, code)).not.toBeNull();
  });
  it("no image means null, the same for everyone", () => {
    const e = loadExtras(file(), cands);
    expect(imageFor(e.photos, first.id)).toBeNull();
  });
});
