import { describe, it, expect } from "vitest";
import raw from "../../lib/data/prices.json";
import { loadPrices } from "../../lib/prices/data";
import { percentChange } from "../../lib/prices/calc";

describe("price data", () => {
  const d = loadPrices(raw);
  it("has at least one item and a retrieval date", () => {
    expect(d.items.length).toBeGreaterThan(0);
    expect(d.retrievedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("gives every item with a figure a source name, a link and a period for both months", () => {
    for (const i of d.items) {
      if (i.now === null) continue;
      expect(i.source.name.length).toBeGreaterThan(0);
      expect(i.source.url).toMatch(/^https:\/\//);
      expect(i.now.period).toMatch(/^\d{4}-\d{2}$/);
      expect(i.then).not.toBeNull();
      expect(i.then!.period).toMatch(/^\d{4}-\d{2}$/);
      expect(i.now.naira).toBeGreaterThan(0);
      expect(i.then!.naira).toBeGreaterThan(0);
    }
  });
  it("compares the same month a year apart", () => {
    for (const i of d.items) {
      if (!i.now || !i.then) continue;
      const [ny, nm] = i.now.period.split("-").map(Number);
      const [ty, tm] = i.then.period.split("-").map(Number);
      expect(nm).toBe(tm);
      expect(ny! - ty!).toBe(1);
    }
  });
  it("says why an item has no figure, instead of leaving it blank", () => {
    for (const i of d.items) if (i.now === null) expect(i.missingReason!.length).toBeGreaterThan(0);
  });
  it("records whether the figure was checked against the original statistics file", () => {
    for (const i of d.items) if (i.now) expect(typeof i.source.checkedAgainstOriginal).toBe("boolean");
  });
  it("matches the percentage change published alongside, where one is recorded", () => {
    for (const i of d.items) {
      if (!i.now || !i.then || i.publishedYoyPercent == null) continue;
      expect(Math.abs(percentChange(i.then.naira, i.now.naira)! - i.publishedYoyPercent)).toBeLessThan(0.15);
    }
  });
  it("rejects a malformed file", () => {
    expect(() => loadPrices({})).toThrow();
    expect(() => loadPrices({ retrievedOn: "2026-11-20", items: [{ id: "x" }] })).toThrow();
  });
});
