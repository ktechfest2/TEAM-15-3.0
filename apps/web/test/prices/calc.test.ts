import { describe, it, expect } from "vitest";
import { quantityFor, percentChange, basketCost, monthsOld, direction } from "../../lib/prices/calc";

describe("quantityFor", () => {
  it("is how much an amount buys at a price", () => {
    expect(quantityFor(1000, 1344.93)).toBeCloseTo(0.7435, 3);
    expect(quantityFor(1000, 2385.15)).toBeCloseTo(0.4193, 3);
  });
  it("refuses a zero, negative or missing price", () => {
    expect(quantityFor(1000, 0)).toBeNull();
    expect(quantityFor(1000, -5)).toBeNull();
    expect(quantityFor(1000, null)).toBeNull();
  });
});

describe("percentChange", () => {
  it("is (now - then) / then, to one decimal place", () => {
    expect(percentChange(1392.71, 1560.56)).toBe(12.1);
    expect(percentChange(2385.15, 1344.93)).toBe(-43.6);
    expect(percentChange(1027.76, 1596.25)).toBe(55.3);
  });
  it("is null when then is zero or a value is missing", () => {
    expect(percentChange(0, 10)).toBeNull();
    expect(percentChange(null, 10)).toBeNull();
    expect(percentChange(10, null)).toBeNull();
  });
});

describe("direction", () => {
  it("calls a change within half a percent about the same", () => {
    expect(direction(0.4)).toBe("same");
    expect(direction(-0.4)).toBe("same");
    expect(direction(0.6)).toBe("more");
    expect(direction(-0.6)).toBe("less");
  });
});

describe("basketCost", () => {
  const prices = {
    beans: { then: 2385.15, now: 1344.93 },
    petrol: { then: 1027.76, now: 1596.25 },
    rice: { then: null, now: null },
  };
  it("adds quantity times price for each ticked item, for both months", () => {
    const r = basketCost([{ id: "beans", qty: 2 }, { id: "petrol", qty: 10 }], prices);
    expect(r.then).toBeCloseTo(2 * 2385.15 + 10 * 1027.76, 2);
    expect(r.now).toBeCloseTo(2 * 1344.93 + 10 * 1596.25, 2);
    expect(r.missing).toEqual([]);
    expect(r.percent).toBe(percentChange(r.then, r.now));
  });
  it("leaves out an item with no official figure and says so, never guessing", () => {
    const r = basketCost([{ id: "beans", qty: 1 }, { id: "rice", qty: 5 }], prices);
    expect(r.then).toBeCloseTo(2385.15, 2);
    expect(r.missing).toEqual(["rice"]);
  });
  it("ignores empty or invalid quantities", () => {
    const r = basketCost([{ id: "beans", qty: 0 }, { id: "petrol", qty: -3 }, { id: "ghost", qty: 1 }], prices);
    expect(r.then).toBe(0);
    expect(r.percent).toBeNull();
  });
});

describe("monthsOld", () => {
  it("counts whole calendar months between a period and today", () => {
    expect(monthsOld("2026-05", new Date("2026-11-20"))).toBe(6);
    expect(monthsOld("2026-11", new Date("2026-11-20"))).toBe(0);
    expect(monthsOld("2025-12", new Date("2026-01-05"))).toBe(1);
  });
});
