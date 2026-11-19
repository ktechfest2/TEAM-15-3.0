import { describe, it, expect } from "vitest";
import { statusForUnit, demoSubmissionsFor } from "../lib/demo";

describe("demo statuses are derived with the tested status rules", () => {
  it("PU 012 has two independent photos that differ, so it is disputed", () => {
    expect(statusForUnit("LA-IKJ-04-012")).toBe("disputed");
    expect(demoSubmissionsFor("LA-IKJ-04-012")).toHaveLength(2);
  });
  it("PU 013 has two independent matching photos, so two people agree", () => {
    expect(statusForUnit("LA-IKJ-04-013")).toBe("two_people_agree");
  });
  it("PU 014 has one clean photo, so it is waiting for review", () => {
    expect(statusForUnit("LA-IKJ-04-014")).toBe("waiting_for_review");
  });
  it("PU 015 has one photo that fails arithmetic, so it needs human review", () => {
    expect(statusForUnit("LA-IKJ-04-015")).toBe("needs_human_review");
  });
  it("units with no demo submissions are waiting for review", () => {
    expect(statusForUnit("KN-FAG-01-001")).toBe("waiting_for_review");
  });
});
