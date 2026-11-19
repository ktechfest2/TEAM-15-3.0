import { describe, it, expect } from "vitest";
import { statusFor } from "../src/status";
import { sub, cleanFields } from "./fixtures";

const other = (over = {}) => sub({ submitterId: "obs-2", sha256: "bbb", ...over });
const altered = { ...cleanFields, parties: { ...cleanFields.parties, "Party B": 89 } };

describe("statusFor", () => {
  it("is waiting for review with no submissions", () => {
    expect(statusFor({ submissions: [], reviewed: false })).toBe("waiting_for_review");
  });
  it("is waiting for review with one clean submission", () => {
    expect(statusFor({ submissions: [sub()], reviewed: false })).toBe("waiting_for_review");
  });
  it("needs human review when the only submission fails arithmetic", () => {
    expect(statusFor({ submissions: [sub({ verified: false })], reviewed: false })).toBe("needs_human_review");
  });
  it("needs human review when the only submission has low confidence", () => {
    expect(statusFor({ submissions: [sub({ lowConfidence: true })], reviewed: false })).toBe("needs_human_review");
  });
  it("is two people agree when two independent clean submissions match", () => {
    expect(statusFor({ submissions: [sub(), other()], reviewed: false })).toBe("two_people_agree");
  });
  it("is disputed when two independent submissions differ", () => {
    expect(statusFor({ submissions: [sub(), other({ fields: altered })], reviewed: false })).toBe("disputed");
  });
  it("does not say two people agree for the same file from two senders", () => {
    expect(statusFor({ submissions: [sub(), other({ sha256: "aaa" })], reviewed: false })).toBe("waiting_for_review");
  });
  it("does not say two people agree for one person submitting twice", () => {
    expect(statusFor({ submissions: [sub(), sub({ sha256: "bbb" })], reviewed: false })).toBe("waiting_for_review");
  });
  it("needs human review when two submissions match but fail arithmetic", () => {
    expect(statusFor({ submissions: [sub({ verified: false }), other({ verified: false })], reviewed: false })).toBe("needs_human_review");
  });
  it("is reviewed once a reviewer has recorded a decision", () => {
    expect(statusFor({ submissions: [sub(), other({ fields: altered })], reviewed: true })).toBe("reviewed");
  });
});
