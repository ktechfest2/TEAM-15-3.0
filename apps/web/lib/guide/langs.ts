import type { Language } from "@voteguard/shared";

/** The five languages of the voter guide. English and Pidgin also exist for the evidence pages. */
export type GuideLang = "en" | "pcm" | "ha" | "yo" | "ig";

export const GUIDE_LANGS: { code: GuideLang; name: string }[] = [
  { code: "en", name: "English" },
  { code: "pcm", name: "Pidgin" },
  { code: "ha", name: "Hausa" },
  { code: "yo", name: "Yorùbá" },
  { code: "ig", name: "Igbo" },
];

export function isGuideLang(v: unknown): v is GuideLang {
  return typeof v === "string" && GUIDE_LANGS.some((l) => l.code === v);
}

/**
 * Only English has been read by its author's team as a native language.
 * Everything else is shown as a draft until a native speaker has checked the sentence templates.
 * Flip a language to true here, and only here, once someone has checked it.
 */
const CHECKED: Record<GuideLang, boolean> = { en: true, pcm: false, ha: false, yo: false, ig: false };
export const isChecked = (l: GuideLang): boolean => CHECKED[l];

export const langLabel = (l: GuideLang): string => GUIDE_LANGS.find((x) => x.code === l)!.name;

/** The evidence pages (result sheets) only exist in English and Pidgin; other languages show English there. */
export const evidenceLang = (l: GuideLang): Language => (l === "pcm" ? "pcm" : "en");

export const htmlLang = (l: GuideLang): string => l;
