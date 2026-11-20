import { describe, it, expect } from "vitest";
import { buildIcs, VOTING_DATE, icsEscape } from "../../lib/plan/ics";

const base = { unitCode: "IK-04-013", unitName: "Ikeja Ward 04 Unit 013", date: "2027-01-16", url: "https://voteguard-360.vercel.app/unit/IK-04-013" };

describe("calendar file", () => {
  const ics = buildIcs(base);
  it("is a valid calendar with one all-day event", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART;VALUE=DATE:20270116");
    expect(ics).toContain("DTEND;VALUE=DATE:20270117");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });
  it("uses CRLF line endings throughout and no bare newlines", () => {
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });
  it("has a stable id so adding it twice does not duplicate", () => {
    expect(buildIcs(base)).toBe(ics);
    expect(ics).toContain("UID:voting-day-IK-04-013-20270116@voteguard-360");
  });
  it("names the unit, links back, and points to INEC for the date", () => {
    expect(ics).toContain("SUMMARY:Voting day: Ikeja Ward 04 Unit 013");
    expect(ics).toContain(base.url);
    expect(ics).toMatch(/inecnigeria\.org/);
    expect(ics).not.toMatch(/example|DEMO/i);
  });
  it("does not state voting rules, hours or what to bring", () => {
    expect(ics).not.toMatch(/\b\d{1,2}:\d{2}\b|\bam\b|\bpm\b|bring|PVC|card/i);
    expect(ics).toMatch(/official|electoral body/i);
  });
  it("escapes commas, semicolons, backslashes and newlines in text fields", () => {
    expect(icsEscape("a,b;c\\d\ne")).toBe("a\\,b\;c\\\\d\\ne");
    const e = buildIcs({ ...base, unitName: "Unit, with; odd\\chars" });
    expect(e).toContain("SUMMARY:Voting day: Unit\\, with\; odd\\\\chars");
  });
  it("folds lines longer than 75 characters", () => {
    for (const line of ics.split("\r\n")) expect(line.length).toBeLessThanOrEqual(75);
  });
  it("rejects a date that is not YYYY-MM-DD", () => {
    expect(() => buildIcs({ ...base, date: "16/01/2027" })).toThrow();
    expect(() => buildIcs({ ...base, date: "2027-13-40" })).toThrow();
  });
  it("the voting date is the Saturday INEC fixed for the presidential election", () => {
    expect(VOTING_DATE).toBe("2027-01-16");
    expect(VOTING_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(VOTING_DATE + "T00:00:00Z").getUTCDay()).toBe(6);
  });
});
