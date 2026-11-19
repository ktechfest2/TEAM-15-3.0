import { describe, it, expect } from "vitest";
import { narrate, numberToWords } from "../src/narrate";
import { cleanFields } from "./fixtures";
import type { Status } from "@voteguard/shared";

const statuses: Status[] = ["waiting_for_review", "needs_human_review", "two_people_agree", "disputed", "reviewed"];

describe("numberToWords", () => {
  it.each([
    [0, "zero"], [9, "nine"], [12, "twelve"], [31, "thirty-one"], [98, "ninety-eight"],
    [100, "one hundred"], [112, "one hundred and twelve"], [241, "two hundred and forty-one"],
    [1000, "one thousand"], [1250, "one thousand, two hundred and fifty"],
  ])("%i", (n, words) => expect(numberToWords(n)).toBe(words));
});

describe("narrate", () => {
  it("reads every party figure in full words", () => {
    const t = narrate({ fields: cleanFields, status: "two_people_agree", differingFields: [] }, "en");
    expect(t).toContain("Party A, one hundred and twelve");
    expect(t).toContain("Party B, ninety-eight");
    expect(t).toContain("Party C, thirty-one");
  });
  it("says two people agree and the numbers add up for an agreeing unit", () => {
    const t = narrate({ fields: cleanFields, status: "two_people_agree", differingFields: [] }, "en");
    expect(t).toContain("Two people agree");
    expect(t).toContain("add up");
  });
  it("names the differing field for a disputed unit and says a person will look", () => {
    const t = narrate({ fields: cleanFields, status: "disputed", differingFields: ["Party B"] }, "en");
    expect(t).toContain("Party B");
    expect(t).toContain("A person will look");
  });
  it.each(statuses)("never uses forbidden wording (%s, English)", (status) => {
    const t = narrate({ fields: cleanFields, status, differingFields: ["Party B"] }, "en");
    expect(t).not.toMatch(/correct|fraud|winner|rigg|stolen/i);
  });
  it.each(statuses)("never uses forbidden wording (%s, Pidgin)", (status) => {
    const t = narrate({ fields: cleanFields, status, differingFields: ["Party B"] }, "pcm");
    expect(t).not.toMatch(/correct|fraud|winner|rigg|stolen/i);
  });
  it("gives a different Pidgin text from the English one", () => {
    const en = narrate({ fields: cleanFields, status: "disputed", differingFields: ["Party B"] }, "en");
    const pcm = narrate({ fields: cleanFields, status: "disputed", differingFields: ["Party B"] }, "pcm");
    expect(pcm).not.toBe(en);
  });
  it("skips missing figures rather than inventing them", () => {
    const t = narrate({ fields: { ...cleanFields, parties: { "Party A": null, "Party B": 98 } }, status: "waiting_for_review", differingFields: [] }, "en");
    expect(t).not.toContain("Party A, ");
    expect(t).toContain("Party B, ninety-eight");
  });
});
