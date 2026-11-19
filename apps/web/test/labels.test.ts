import { describe, it, expect } from "vitest";
import type { ResultFields } from "@voteguard/shared";
import { fieldRows, differingKeys, eventSentence, decisionLabel, parseFigure, fromInputs, toInputs } from "../lib/client/labels";

const fields = (over: Partial<ResultFields> = {}): ResultFields => ({ registered: 520, accredited: 310, parties: { "Party A": 112, "Party B": 98 }, valid: 210, rejected: 9, cast: 219, ...over });

describe("fieldRows", () => {
  it("lists registered, accredited, each party, then valid, rejected, cast, with readable labels", () => {
    expect(fieldRows(fields()).map((r) => [r.key, r.label])).toEqual([
      ["registered", "Registered voters"], ["accredited", "Accredited voters"],
      ["Party A", "Party A"], ["Party B", "Party B"],
      ["valid", "Valid votes"], ["rejected", "Rejected votes"], ["cast", "Total votes cast"],
    ]);
  });
});

describe("differingKeys", () => {
  it("returns the figures that are not identical across all photos", () => {
    const a = fields(), b = fields({ parties: { "Party A": 112, "Party B": 89 } });
    expect([...differingKeys([a, b])]).toEqual(["Party B"]);
  });
  it("is empty for one photo or identical photos", () => {
    expect(differingKeys([fields()]).size).toBe(0);
    expect(differingKeys([fields(), fields()]).size).toBe(0);
  });
  it("treats a missing party in one photo as different", () => {
    expect(differingKeys([fields(), fields({ parties: { "Party A": 112 } })]).has("Party B")).toBe(true);
  });
});

describe("eventSentence", () => {
  it.each([
    ["submission.fingerprinted", {}, /fingerprint/i],
    ["submission.hash_checked", { match: true }, /matched/i],
    ["submission.hash_checked", { match: false }, /did not match/i],
    ["submission.hash_mismatch", {}, /flagged/i],
    ["extraction.recorded", { engine: "cached-fixture" }, /read/i],
    ["verification.recorded", { arithmetic_ok: true, failed_rules: [] }, /add up/i],
    ["verification.recorded", { arithmetic_ok: false, failed_rules: ["valid_plus_rejected_equals_cast"] }, /do not add up/i],
    ["extraction.confirmed", { changed: [{ field: "cast" }] }, /confirmed/i],
    ["status.changed", { from: "waiting_for_review", to: "disputed" }, /Photos differ/],
    ["review.recorded", { decision: "leave_open" }, /reviewer/i],
  ])("describes %s in plain words", (type, payload, re) => {
    expect(eventSentence(type, payload as Record<string, unknown>)).toMatch(re);
  });
  it("never says fraud, correct or winner", () => {
    for (const t of ["submission.hash_mismatch", "status.changed", "review.recorded", "verification.recorded"]) {
      expect(eventSentence(t, { to: "disputed", decision: "matches_1", arithmetic_ok: false, failed_rules: [] }).toLowerCase()).not.toMatch(/\b(fraud|correct|winner)\b/);
    }
  });
  it("falls back to the raw type for unknown events", () => {
    expect(eventSentence("something.new", {})).toBe("something.new");
  });
});

describe("decisionLabel", () => {
  it("has a neutral label per decision", () => {
    expect(decisionLabel("matches_1")).toMatch(/photo 1/i);
    expect(decisionLabel("request_new_photo")).toMatch(/new photo/i);
  });
});

describe("figure inputs", () => {
  it("parses whole numbers, blank as missing, and rejects the rest", () => {
    expect(parseFigure("42")).toBe(42);
    expect(parseFigure(" 7 ")).toBe(7);
    expect(parseFigure("")).toBeNull();
    expect(parseFigure("4x")).toBeNaN();
    expect(parseFigure("1.5")).toBeNaN();
    expect(parseFigure("-3")).toBe(-3);
  });
  it("round-trips fields through the form inputs", () => {
    const f = fields({ rejected: null });
    expect(fromInputs(toInputs(f))).toEqual(f);
  });
  it("returns null when any input is not a whole number, so nothing invalid is sent", () => {
    const i = toInputs(fields());
    i.valid = "lots";
    expect(fromInputs(i)).toBeNull();
  });
});
