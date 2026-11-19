import { describe, it, expect } from "vitest";
import { compareSubmissions } from "../src/compare";
import { sub, cleanFields } from "./fixtures";

describe("compareSubmissions", () => {
  it("agrees when independent submissions have identical values", () => {
    const r = compareSubmissions(sub(), sub({ submitterId: "obs-2", sha256: "bbb" }));
    expect(r).toEqual({ independent: true, agree: true, differences: [] });
  });
  it("names the single field that differs", () => {
    const altered = { ...cleanFields, parties: { ...cleanFields.parties, "Party B": 89 } };
    const r = compareSubmissions(sub(), sub({ submitterId: "obs-2", sha256: "bbb", fields: altered }));
    expect(r.agree).toBe(false);
    expect(r.differences).toEqual([{ field: "Party B", a: 98, b: 89 }]);
  });
  it("reports differences in totals too", () => {
    const r = compareSubmissions(sub(), sub({ submitterId: "obs-2", sha256: "bbb", fields: { ...cleanFields, cast: 249 } }));
    expect(r.differences.map((d) => d.field)).toEqual(["cast"]);
  });
  it("does not treat the same file hash from two senders as independent", () => {
    const r = compareSubmissions(sub(), sub({ submitterId: "obs-2" }));
    expect(r.independent).toBe(false);
  });
  it("does not treat one person submitting twice as independent", () => {
    const r = compareSubmissions(sub(), sub({ sha256: "bbb" }));
    expect(r.independent).toBe(false);
  });
});
