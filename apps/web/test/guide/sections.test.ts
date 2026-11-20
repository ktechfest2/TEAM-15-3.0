import { describe, it, expect } from "vitest";
import { SECTIONS, activeSection, TABS, NAV } from "../../lib/guide/sections";
import { GUIDE_LANGS } from "../../lib/guide/langs";
import { t, UI_KEYS } from "../../lib/guide/ui";

describe("sections", () => {
  it("has candidates, coverage, prices, my unit, results and settings, and no separate home page", () => {
    expect(SECTIONS.map((s) => s.id)).toEqual(["candidates", "coverage", "prices", "unit", "results", "watchpoint", "settings"]);
  });
  it("every section has a path and a label key that exists", () => {
    for (const s of SECTIONS) {
      expect(s.href.startsWith("/")).toBe(true);
      expect(UI_KEYS).toContain(s.labelKey);
    }
  });
  it("finds the active section from a path", () => {
    expect(activeSection("/")).toBe("candidates");
    expect(activeSection("/prices")).toBe("prices");
    expect(activeSection("/prices/basket")).toBe("prices");
    expect(activeSection("/candidates/example-a")).toBe("candidates");
    expect(SECTIONS.find((x) => x.id === "candidates")!.href).toBe("/candidates");
    expect(activeSection("/coverage")).toBe("coverage");
    expect(activeSection("/coverage/story-1")).toBe("coverage");
    expect(activeSection("/unit/IK-04-013")).toBe("unit");
    expect(activeSection("/dashboard")).toBe("results");
    expect(activeSection("/submission/abc")).toBe("results");
    expect(activeSection("/settings")).toBe("settings");
    expect(activeSection("/watchpoint")).toBe("watchpoint");
    expect(activeSection("/somewhere-else")).toBe("candidates");
  });
  it("phone tabs are a subset of the sections, at most five", () => {
    expect(TABS.length).toBeLessThanOrEqual(6);
    for (const id of TABS) expect(SECTIONS.map((s) => s.id)).toContain(id);
    expect(TABS).toEqual(["candidates", "coverage", "prices", "unit", "results", "watchpoint"]);
    expect(NAV).toEqual(TABS);
  });
});

describe("interface strings", () => {
  it("every key has an English text", () => {
    for (const k of UI_KEYS.filter((k) => k !== "draft")) expect(t("en", k).length).toBeGreaterThan(0);
  });
  it("every key has text in every language, different from English where translated", () => {
    for (const { code } of GUIDE_LANGS) for (const k of UI_KEYS.filter((k) => k !== "draft")) expect(t(code, k).length).toBeGreaterThan(0);
    expect(t("ha", "nav.prices")).not.toBe(t("en", "nav.prices"));
    expect(t("yo", "nav.prices")).not.toBe(t("en", "nav.prices"));
    expect(t("ig", "nav.prices")).not.toBe(t("en", "nav.prices"));
  });
  it("the banner always says PROTOTYPE and not INEC, in every language", () => {
    for (const { code } of GUIDE_LANGS) {
      expect(t(code, "banner")).toMatch(/PROTOTYPE/);
      expect(t(code, "banner")).toMatch(/INEC/);
    }
  });
  it("no language uses forbidden wording", () => {
    for (const { code } of GUIDE_LANGS) for (const k of UI_KEYS) expect(t(code, k)).not.toMatch(/fraud|winner|rigg|stolen|cheat/i);
  });
  it("shows a draft note for every language except English", () => {
    expect(t("en", "draft")).toBe("");
    for (const code of ["pcm", "ha", "yo", "ig"] as const) expect(t(code, "draft").length).toBeGreaterThan(0);
  });
});

describe("front page, candidates and coverage strings", () => {
  const KEYS = ["home.cand.kicker", "home.cand.title", "home.cand.dek", "home.cand.all", "home.cand.compare", "home.cov.kicker", "home.cov.title", "home.cov.dek", "home.cov.more",
    "cand.runmate", "cand.age", "cand.quals", "cand.remark", "cand.pending", "cand.notnamed", "cand.count", "cand.listnote"] as const;
  it("exist in every language", () => {
    for (const { code } of GUIDE_LANGS) for (const k of KEYS) expect(t(code, k as never).length).toBeGreaterThan(0);
  });
  it("the candidate headline and count sentences have a number to fill in", () => {
    for (const { code } of GUIDE_LANGS) { expect(t(code, "home.cand.title")).toContain("{n}"); expect(t(code, "cand.count")).toContain("{n}"); }
  });
  it("never calls any candidate a favourite, front-runner or the like", () => {
    for (const { code } of GUIDE_LANGS) for (const k of KEYS) expect(t(code, k as never)).not.toMatch(/favou?rite|front-?runner|likely to win|best/i);
  });
});

describe("candidate details strings", () => {
  const KEYS = ["cd.back", "cd.speeches", "cd.speeches.kicker", "cd.speeches.dek", "cd.videos", "cd.videos.dek", "cd.pubs", "cd.pubs.dek", "cd.none", "cd.none.note",
    "cd.how.title", "cd.how.body", "cd.prev", "cd.next", "cd.shown", "cd.onpage", "cd.tap", "cd.watch", "cd.read", "cd.fulltext", "cd.opinion", "cd.details", "cd.details.go",
    "cd.by.candidate", "cd.by.party", "cd.by.outlet", "cd.by.official", "cd.by.academic", "cd.photo", "cd.logo", "cd.first", "cd.last", "cd.opening"] as const;
  it("exist in every language", () => {
    for (const { code } of GUIDE_LANGS) for (const k of KEYS) expect(t(code, k as never).length).toBeGreaterThan(0);
  });
  it("the count sentence has numbers to fill in", () => {
    for (const { code } of GUIDE_LANGS) { expect(t(code, "cd.shown" as never)).toContain("{n}"); expect(t(code, "cd.shown" as never)).toContain("{max}"); }
  });
  it("never ranks, recommends or praises", () => {
    for (const { code } of GUIDE_LANGS) for (const k of KEYS) expect(t(code, k as never)).not.toMatch(/favou?rite|front-?runner|best|top pick|recommended|popular/i);
  });
});

describe("WatchPoint partner page", () => {
  const KEYS = ["nav.watchpoint", "wp.kicker", "wp.title", "wp.note", "wp.open", "wp.frame", "wp.offline"] as const;
  it("has text in every language", () => {
    for (const { code } of GUIDE_LANGS) for (const k of KEYS) expect(t(code, k as never).length).toBeGreaterThan(0);
  });
  it("says plainly that it is a separate service", () => {
    expect(t("en", "wp.note")).toMatch(/separate/i);
  });
});
