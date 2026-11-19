import { describe, it, expect } from "vitest";
import { statusCopy, STATUSES } from "../lib/status-copy";

describe("easy-read status copy (A3)", () => {
  it("covers every allowed status", () => {
    expect([...STATUSES].sort()).toEqual(["disputed", "needs_human_review", "reviewed", "two_people_agree", "waiting_for_review"]);
  });
  it.each(STATUSES)("%s has a label, icon and one short sentence in English and Pidgin", (s) => {
    for (const lang of ["en", "pcm"] as const) {
      const c = statusCopy(s, lang);
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.icon.length).toBeGreaterThan(0);
      expect(c.sentence.length).toBeGreaterThan(0);
      expect(c.sentence.length).toBeLessThanOrEqual(90);
      expect(c.sentence.split(/[.!?]/).filter(Boolean).length).toBeLessThanOrEqual(2);
    }
  });
  it.each(STATUSES)("%s never uses forbidden wording", (s) => {
    for (const lang of ["en", "pcm"] as const) {
      const c = statusCopy(s, lang);
      expect(`${c.label} ${c.sentence}`).not.toMatch(/correct|fraud|winner|rigg|stolen|cheat/i);
    }
  });
  it("gives different Pidgin text from English", () => {
    expect(statusCopy("disputed", "pcm").sentence).not.toBe(statusCopy("disputed", "en").sentence);
  });
});
