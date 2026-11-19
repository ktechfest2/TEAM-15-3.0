import { describe, it, expect } from "vitest";
import { validateArithmetic } from "../src/validate";
import { cleanFields } from "./fixtures";

const failing = (r: ReturnType<typeof validateArithmetic>) =>
  r.checks.filter((c) => !c.ok).map((c) => c.rule);

describe("validateArithmetic", () => {
  it("passes a consistent sheet with every rule checked", () => {
    const r = validateArithmetic(cleanFields);
    expect(r.ok).toBe(true);
    expect(r.checks.map((c) => c.rule).sort()).toEqual(
      [
        "accredited_not_above_registered",
        "cast_not_above_accredited",
        "no_missing",
        "no_negative",
        "parties_sum_to_valid",
        "valid_plus_rejected_equals_cast",
      ].sort(),
    );
  });
  it("fails when party votes do not add up to valid votes, naming the figures", () => {
    const r = validateArithmetic({ ...cleanFields, valid: 250 });
    expect(r.ok).toBe(false);
    expect(failing(r)).toContain("parties_sum_to_valid");
    const msg = r.checks.find((c) => c.rule === "parties_sum_to_valid")!.message;
    expect(msg).toContain("241");
    expect(msg).toContain("250");
  });
  it("fails when valid plus rejected is not total cast", () => {
    expect(failing(validateArithmetic({ ...cleanFields, cast: 251 }))).toContain(
      "valid_plus_rejected_equals_cast",
    );
  });
  it("fails when cast is above accredited", () => {
    const r = validateArithmetic({ ...cleanFields, accredited: 200 });
    expect(failing(r)).toContain("cast_not_above_accredited");
  });
  it("fails when accredited is above registered", () => {
    const r = validateArithmetic({ ...cleanFields, registered: 300 });
    expect(failing(r)).toContain("accredited_not_above_registered");
  });
  it("flags negative values", () => {
    const r = validateArithmetic({ ...cleanFields, rejected: -1 });
    expect(failing(r)).toContain("no_negative");
  });
  it("flags missing values and does not crash on them", () => {
    const r = validateArithmetic({ ...cleanFields, parties: { "Party A": null, "Party B": 98, "Party C": 31 } });
    expect(r.ok).toBe(false);
    expect(failing(r)).toContain("no_missing");
  });
  it("flags a missing total instead of passing it silently", () => {
    const r = validateArithmetic({ ...cleanFields, cast: null });
    expect(r.ok).toBe(false);
    expect(failing(r)).toContain("no_missing");
  });
});
