import type { GuideLang } from "../guide/langs";

/**
 * Fixed sentence templates. Numbers are put in by code from the data file, never written by a model.
 * Pidgin, Hausa, Yoruba and Igbo are DRAFTS pending a native-speaker check (see guide/langs.ts).
 */
export interface Templates {
  buys: string;
  basket: { more: string; less: string; same: string };
}

export const SENTENCE_TEMPLATES: Record<GuideLang, Templates> = {
  en: {
    buys: "A year ago, ₦1,000 bought {then} of {item}. Now it buys {now}.",
    basket: { more: "That is {pct}% more.", less: "That is {pct}% less.", same: "That is about the same." },
  },
  pcm: {
    buys: "One year ago, ₦1,000 fit buy {then} of {item}. Now e dey buy {now}.",
    basket: { more: "E don increase by {pct}%.", less: "E don reduce by {pct}%.", same: "E dey about di same." },
  },
  ha: {
    buys: "Shekara guda da ta wuce, ₦1,000 ya sayi {then} na {item}. Yanzu yana sayen {now}.",
    basket: { more: "Wannan ya ƙaru da {pct}%.", less: "Wannan ya ragu da {pct}%.", same: "Wannan kusan iri ɗaya ne." },
  },
  yo: {
    buys: "Ní ọdún kan sẹ́yìn, ₦1,000 ra {then} {item}. Nísinsin yìí, ó ra {now}.",
    basket: { more: "Ó ti pọ̀ sí i ní {pct}%.", less: "Ó ti dín kù ní {pct}%.", same: "Ó fẹ́rẹ̀ẹ́ jẹ́ bákan náà." },
  },
  ig: {
    buys: "Afọ gara aga, ₦1,000 zụtara {then} nke {item}. Ugbu a, ọ na-azụta {now}.",
    basket: { more: "Ọ rịgoro {pct}%.", less: "Ọ gbadara {pct}%.", same: "Ọ fọrọ nke nta bụrụ otu." },
  },
};

export const ITEM_NAMES: Record<string, Record<GuideLang, string>> = {
  beans: { en: "brown beans", pcm: "beans (brown)", ha: "wake", yo: "ẹ̀wà", ig: "agwa" },
  tomato: { en: "tomatoes", pcm: "tomato", ha: "tumatir", yo: "tòmátì", ig: "tomato" },
  petrol: { en: "petrol", pcm: "petrol", ha: "man fetur", yo: "epo ọkọ̀ (petirolu)", ig: "mmanụ ụgbọ ala (petrol)" },
  rice: { en: "local rice", pcm: "local rice", ha: "shinkafa", yo: "ìrẹsì", ig: "osikapa" },
  garri: { en: "white garri", pcm: "garri (white)", ha: "gari", yo: "gààrí", ig: "garri" },
};

export function itemName(id: string, lang: GuideLang): string {
  return ITEM_NAMES[id]?.[lang] ?? ITEM_NAMES[id]?.en ?? id;
}

export function formatNaira(n: number): string {
  const whole = Number.isInteger(n);
  return "₦" + n.toLocaleString("en-US", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
}

/** Small amounts in grams or millilitres (nearest 10), larger ones with one decimal. */
export function formatQuantity(unit: "kg" | "litre", n: number): string {
  const small = Math.round((n * 1000) / 10) * 10;
  if (small < 1000) return `${small} ${unit === "kg" ? "g" : "ml"}`;
  const v = n.toFixed(1);
  if (unit === "kg") return `${v} kg`;
  return `${v} ${v === "1.0" ? "litre" : "litres"}`;
}

export function buysSentence(lang: GuideLang, itemId: string, then: string, now: string): string {
  return SENTENCE_TEMPLATES[lang].buys.replace("{item}", itemName(itemId, lang)).replace("{then}", then).replace("{now}", now);
}

export function basketSentence(lang: GuideLang, dir: "more" | "less" | "same", pct: number): string {
  return SENTENCE_TEMPLATES[lang].basket[dir].replace("{pct}", Math.abs(pct).toFixed(1));
}
