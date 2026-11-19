import { describe, it, expect } from "vitest";
import { searchUnits, optionsFor, units } from "../lib/units";

describe("seed data", () => {
  it("has a realistic synthetic set, all labelled demo", () => {
    expect(units.length).toBeGreaterThanOrEqual(100);
    expect(units.every((u) => u.source === "demo_synthetic")).toBe(true);
  });
  it("has unique codes and ids", () => {
    expect(new Set(units.map((u) => u.code)).size).toBe(units.length);
    expect(new Set(units.map((u) => u.id)).size).toBe(units.length);
  });
  it("contains the demo unit PU 012 Ikeja Primary School, Ward 04, Lagos", () => {
    const u = units.find((x) => x.code === "LA-IKJ-04-012");
    expect(u).toMatchObject({ name: "Ikeja Primary School", ward: "Ward 04", lga: "Ikeja", state: "Lagos" });
  });
});

describe("optionsFor (cascading selects)", () => {
  it("lists all states with nothing chosen", () => {
    expect(optionsFor({}).states).toEqual(["FCT", "Kano", "Lagos"]);
  });
  it("lists only LGAs of the chosen state", () => {
    expect(optionsFor({ state: "Lagos" }).lgas).toEqual(["Ikeja", "Surulere"]);
  });
  it("lists only wards of the chosen LGA", () => {
    expect(optionsFor({ state: "Lagos", lga: "Ikeja" }).wards).toEqual(["Ward 01", "Ward 02", "Ward 03", "Ward 04"]);
  });
  it("gives no LGAs or wards until their parent is chosen", () => {
    const o = optionsFor({});
    expect(o.lgas).toEqual([]);
    expect(o.wards).toEqual([]);
  });
});

describe("searchUnits", () => {
  it("returns everything with no filter", () => {
    expect(searchUnits({}).length).toBe(units.length);
  });
  it("filters by state, LGA and ward", () => {
    const r = searchUnits({ state: "Lagos", lga: "Ikeja", ward: "Ward 04" });
    expect(r.length).toBe(6);
    expect(r.every((u) => u.state === "Lagos" && u.lga === "Ikeja" && u.ward === "Ward 04")).toBe(true);
  });
  it("finds a unit by exact code", () => {
    expect(searchUnits({ query: "LA-IKJ-04-012" }).map((u) => u.code)).toEqual(["LA-IKJ-04-012"]);
  });
  it("finds units by part of the name, ignoring case", () => {
    const r = searchUnits({ query: "ikeja primary" });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((u) => u.name.toLowerCase().includes("ikeja primary"))).toBe(true);
  });
  it("combines the query with the filters", () => {
    const r = searchUnits({ state: "Kano", query: "school" });
    expect(r.every((u) => u.state === "Kano" && u.name.toLowerCase().includes("school"))).toBe(true);
  });
  it("returns an empty list when nothing matches", () => {
    expect(searchUnits({ query: "zzzz-nothing" })).toEqual([]);
  });
});
