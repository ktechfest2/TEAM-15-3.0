import { describe, it, expect } from "vitest";
import raw from "../../lib/data/candidates.json";
import { loadCandidates, FIELD_ORDER, displayName } from "../../lib/candidates/data";
import { compareCandidates } from "../../lib/candidates/compare";

const EVALUATIVE = /\b(best|worst|good|bad|great|poor|corrupt|honest|dishonest|failed|failure|successful|success|promise[sd]?|kept|broken|experienced|inexperienced|leader|winner|loser|fraud|clean|dirty|popular|trusted|likely|frontrunner|favourite)\b/i;

const DATA = loadCandidates(raw);
const by = (id: string) => DATA.candidates.find((c) => c.id === id)!;

describe("candidate data (INEC final list, presidential)", () => {
  it("names 18 candidates and lists one row INEC left without a name", () => {
    expect(DATA.candidates).toHaveLength(18);
    expect(DATA.notNamed).toEqual([{ party: "A", partyName: "Accord", remark: "COURT ORDER" }]);
  });
  it("cites INEC's list with a link and a check date", () => {
    expect(DATA.source.url).toMatch(/^https:\/\/inecnigeria\.org\//);
    expect(DATA.source.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(DATA.source.name.length).toBeGreaterThan(0);
  });
  it("has the election date INEC gives, a Saturday", () => {
    expect(DATA.election).toBe("2027-01-16");
    expect(new Date(DATA.election + "T00:00:00Z").getUTCDay()).toBe(6);
  });
  it("lists candidates A to Z by surname, whatever order the file has", () => {
    const keys = DATA.candidates.map((c) => `${c.surname} ${c.given}`);
    expect(keys).toEqual([...keys].sort((a, b) => a.localeCompare(b)));
  });
  it("gives every candidate the same fields, none empty", () => {
    for (const c of DATA.candidates) {
      expect(c.id).toMatch(/^[a-z0-9-]+$/);
      expect(c.surname.length).toBeGreaterThan(0);
      expect(c.given.length).toBeGreaterThan(0);
      expect(c.partyName.length).toBeGreaterThan(0);
      expect(Number.isInteger(c.age) && c.age >= 18 && c.age < 110).toBe(true);
      expect(c.qualifications.length).toBeGreaterThan(0);
      expect(c.runningMate.name.length).toBeGreaterThan(0);
      expect(Number.isInteger(c.runningMate.age)).toBe(true);
      expect(c.runningMate.qualifications.length).toBeGreaterThan(0);
    }
    expect(new Set(DATA.candidates.map((c) => c.id)).size).toBe(18);
  });
  it("matches INEC's list on rows I checked by eye against the PDF", () => {
    const tinubu = by("tinubu-bola-ahmed");
    expect([tinubu.party, tinubu.age, tinubu.qualifications, tinubu.runningMate.name]).toEqual(["APC", 74, "B.Sc", "Shettima Kashim"]);
    const atiku = by("abubakar-atiku");
    expect([atiku.party, atiku.age, atiku.runningMate.name]).toEqual(["ADC", 79, "Amaechi Chibuike Rotimi"]);
    const obi = by("obi-peter-gregory");
    expect([obi.party, obi.partyName, obi.age]).toEqual(["NDC", "Nigeria Democratic Congress", 65]);
    const duke = by("duke-donald");
    expect([duke.party, duke.runningMate.name, duke.remark]).toEqual(["PRP", "Mohammed Sule", "C"]);
    expect(by("obi-peter-gregory").runningMate.name).toBe("Musa Mohammed Rabiu Kwankwaso");
  });
  it("prints candidate names exactly as INEC does, surname first", () => {
    expect(displayName(by("tinubu-bola-ahmed"))).toBe("Tinubu Bola Ahmed");
    expect(displayName(by("abbas-bin-aliyu"))).toBe("Abbas-Bin Aliyu");
  });
  it("uses no evaluative words, scores, ratings, colours or photos anywhere", () => {
    const text = JSON.stringify(DATA);
    expect(text).not.toMatch(EVALUATIVE);
    expect(text).not.toMatch(/"(score|rating|rank|stars|color|colour|photo|image)"/i);
  });
  it("rejects a malformed file, an unknown party, or a candidate with no age", () => {
    expect(() => loadCandidates({})).toThrow();
    const a = JSON.parse(JSON.stringify(raw)); a.candidates[0].party = "ZZZ";
    expect(() => loadCandidates(a)).toThrow();
    const b = JSON.parse(JSON.stringify(raw)); delete b.candidates[0].age;
    expect(() => loadCandidates(b)).toThrow();
    const c = JSON.parse(JSON.stringify(raw)); c.source.url = "http://x.org";
    expect(() => loadCandidates(c)).toThrow();
  });
});

describe("comparing two candidates", () => {
  const a = by("abubakar-atiku"), b = by("adebayo-adewole-ebenezer");
  const rows = compareCandidates(a, b, "en");
  it("lines the same fields up in the fixed order", () => {
    expect(rows.map((r) => r.field)).toEqual(FIELD_ORDER);
  });
  it("shows each side's text and whether they match, and nothing that ranks them", () => {
    for (const r of rows) {
      expect(r.a.length).toBeGreaterThan(0);
      expect(r.b.length).toBeGreaterThan(0);
      expect(Object.keys(r).sort()).toEqual(["a", "b", "field", "same"]);
    }
  });
  it("is symmetric about which fields match", () => {
    expect(compareCandidates(b, a, "en").map((r) => r.same)).toEqual(rows.map((r) => r.same));
  });
});
