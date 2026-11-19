import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { createExtractionAdapter, CachedExtractionAdapter, LOW_CONFIDENCE_THRESHOLD } from "../src";
import fixtures from "../src/fixtures.json";

const sheetsDir = join(__dirname, "..", "..", "..", "public", "sample-result-sheets");
const bytes = (name: string) => new Uint8Array(readFileSync(join(sheetsDir, name + ".png")));
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

afterEach(() => vi.restoreAllMocks());

describe("fixtures", () => {
  it("has an entry for each of the three DEMO sheets, keyed by file hash", () => {
    for (const name of ["sheet-a-clean", "sheet-b-altered-figure", "sheet-c-bad-arithmetic"]) {
      expect(Object.keys(fixtures)).toContain(sha(bytes(name)));
    }
  });
});

describe("CachedExtractionAdapter", () => {
  const adapter = new CachedExtractionAdapter();

  it("returns the printed figures for the clean sheet with high confidence", async () => {
    const b = bytes("sheet-a-clean");
    const r = await adapter.extract({ sha256: sha(b), bytes: b });
    expect(r.fields).toEqual({
      registered: 520, accredited: 310, parties: { "Party A": 112, "Party B": 98, "Party C": 31 },
      valid: 241, rejected: 9, cast: 250,
    });
    expect(r.lowConfidence).toBe(false);
    expect(r.engine).toBe("cached-fixture");
  });
  it("returns the altered figure for the altered sheet", async () => {
    const b = bytes("sheet-b-altered-figure");
    const r = await adapter.extract({ sha256: sha(b), bytes: b });
    expect(r.fields.parties["Party B"]).toBe(89);
  });
  it("returns the bad total for the bad-arithmetic sheet", async () => {
    const b = bytes("sheet-c-bad-arithmetic");
    const r = await adapter.extract({ sha256: sha(b), bytes: b });
    expect(r.fields.cast).toBe(260);
  });
  it("gives a confidence for every figure", async () => {
    const b = bytes("sheet-a-clean");
    const r = await adapter.extract({ sha256: sha(b), bytes: b });
    for (const key of ["registered", "accredited", "valid", "rejected", "cast", "Party A", "Party B", "Party C"]) {
      expect(r.confidence[key]).toBeGreaterThan(0);
    }
  });
  it("never guesses for an unknown image: all figures missing, zero confidence, flagged", async () => {
    const r = await adapter.extract({ sha256: "f".repeat(64) });
    expect(r.fields.registered).toBeNull();
    expect(r.fields.valid).toBeNull();
    expect(r.fields.cast).toBeNull();
    expect(Object.values(r.fields.parties).every((v) => v === null)).toBe(true);
    expect(Object.values(r.confidence).every((c) => c === 0)).toBe(true);
    expect(r.lowConfidence).toBe(true);
    expect(r.engine).toBe("unknown-image");
  });
});

describe("createExtractionAdapter (Anthropic integration is stubbed)", () => {
  it("uses cached fixtures in cached mode", async () => {
    const a = createExtractionAdapter({ mode: "cached" });
    const b = bytes("sheet-a-clean");
    expect((await a.extract({ sha256: sha(b), bytes: b })).engine).toBe("cached-fixture");
  });
  it("in live mode without a key, falls back to a stub, never throws, never calls the network", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const a = createExtractionAdapter({ mode: "live" });
    const r = await a.extract({ sha256: "e".repeat(64) });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(r.engine).toBe("anthropic-stub");
    expect(r.lowConfidence).toBe(true);
  });
  it("even with a key present the live adapter is a stub that makes no network call", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const a = createExtractionAdapter({ mode: "live", anthropicApiKey: "not-a-real-key" });
    await a.extract({ sha256: "e".repeat(64) });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("live stub still serves known demo sheets from the cache so the demo works", async () => {
    const a = createExtractionAdapter({ mode: "live" });
    const b = bytes("sheet-b-altered-figure");
    const r = await a.extract({ sha256: sha(b), bytes: b });
    expect(r.fields.parties["Party B"]).toBe(89);
  });
  it("treats an unrecognised mode as cached", async () => {
    const a = createExtractionAdapter({ mode: "banana" as never });
    expect((await a.extract({ sha256: "0".repeat(64) })).engine).toBe("unknown-image");
  });
  it("exposes the low-confidence threshold", () => {
    expect(LOW_CONFIDENCE_THRESHOLD).toBeGreaterThan(0.5);
    expect(LOW_CONFIDENCE_THRESHOLD).toBeLessThan(1);
  });
});
