import { describe, it, expect } from "vitest";
import { GUIDE_LANGS } from "../../lib/guide/langs";
import { buysSentence, basketSentence, itemName, formatQuantity, formatNaira, SENTENCE_TEMPLATES, ITEM_NAMES } from "../../lib/prices/copy";

const FORBIDDEN = /because|blame|fail|thanks to|fault|government|president|APC|PDP|\bLP\b|NNPP|fraud|winner|rigg/i;

describe("formatting", () => {
  it("shows small amounts in grams or millilitres and larger ones with one decimal", () => {
    expect(formatQuantity("kg", 0.7435)).toBe("740 g");
    expect(formatQuantity("kg", 0.4193)).toBe("420 g");
    expect(formatQuantity("kg", 1.26)).toBe("1.3 kg");
    expect(formatQuantity("litre", 0.6265)).toBe("630 ml");
    expect(formatQuantity("litre", 2)).toBe("2.0 litres");
    expect(formatQuantity("litre", 1)).toBe("1.0 litre");
  });
  it("shows naira with thousands separators and no stray decimals for whole numbers", () => {
    expect(formatNaira(1344.93)).toBe("₦1,344.93");
    expect(formatNaira(25000)).toBe("₦25,000");
    expect(formatNaira(0)).toBe("₦0");
  });
});

describe("templates, all five languages", () => {
  it("has a buys sentence and three basket sentences for every language", () => {
    for (const { code } of GUIDE_LANGS) {
      const t = SENTENCE_TEMPLATES[code];
      expect(t.buys).toContain("{item}");
      expect(t.buys).toContain("{then}");
      expect(t.buys).toContain("{now}");
      for (const d of ["more", "less", "same"] as const) expect(t.basket[d].length).toBeGreaterThan(0);
      expect(t.basket.more).toContain("{pct}");
      expect(t.basket.less).toContain("{pct}");
    }
  });
  it("has a name for every item in every language", () => {
    for (const { code } of GUIDE_LANGS) for (const id of Object.keys(ITEM_NAMES)) expect(itemName(id, code).length).toBeGreaterThan(0);
  });
  it("uses no blame, praise, party or forbidden wording anywhere", () => {
    for (const { code } of GUIDE_LANGS) {
      const t = SENTENCE_TEMPLATES[code];
      const all = [t.buys, t.basket.more, t.basket.less, t.basket.same, ...Object.keys(ITEM_NAMES).map((id) => itemName(id, code))].join(" ");
      expect(all).not.toMatch(FORBIDDEN);
    }
  });
  it("fills the numbers from data, in every language, leaving no placeholder behind", () => {
    for (const { code } of GUIDE_LANGS) {
      const s = buysSentence(code, "beans", "740 g", "420 g");
      expect(s).toContain("740 g");
      expect(s).toContain("420 g");
      expect(s).not.toMatch(/[{}]/);
      for (const d of ["more", "less", "same"] as const) expect(basketSentence(code, d, 12.1)).not.toMatch(/[{}]/);
      expect(basketSentence(code, "more", 12.1)).toContain("12.1");
      expect(basketSentence(code, "less", 43.6)).toContain("43.6");
    }
  });
  it("shows the size of a fall as a positive number, with the word for less", () => {
    expect(basketSentence("en", "less", -43.6)).toBe("That is 43.6% less.");
    expect(basketSentence("en", "more", 12.1)).toBe("That is 12.1% more.");
    expect(basketSentence("en", "same", 0.2)).toBe("That is about the same.");
  });
  it("differs by language", () => {
    expect(buysSentence("ha", "beans", "a", "b")).not.toBe(buysSentence("en", "beans", "a", "b"));
    expect(buysSentence("yo", "beans", "a", "b")).not.toBe(buysSentence("en", "beans", "a", "b"));
    expect(buysSentence("ig", "beans", "a", "b")).not.toBe(buysSentence("en", "beans", "a", "b"));
  });
});
