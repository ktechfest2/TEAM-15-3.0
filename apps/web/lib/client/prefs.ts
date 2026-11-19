import type { Language } from "@voteguard/shared";

export const TEXT_SCALES = [1, 1.25, 1.5] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

export interface Prefs {
  lang: Language;
  textScale: TextScale;
  contrast: boolean;
  reduceMotion: boolean;
  slowVoice: boolean;
}

export const DEFAULT_PREFS: Prefs = { lang: "en", textScale: 1, contrast: false, reduceMotion: false, slowVoice: false };
export const PREFS_KEY = "voteguard.prefs";

/** Read saved preferences defensively: anything missing or wrong falls back to the default for that field. */
export function parsePrefs(raw: string | null): Prefs {
  let v: unknown;
  try { v = raw ? JSON.parse(raw) : null; } catch { return { ...DEFAULT_PREFS }; }
  if (v === null || typeof v !== "object" || Array.isArray(v)) return { ...DEFAULT_PREFS };
  const o = v as Record<string, unknown>;
  return {
    lang: o.lang === "pcm" || o.lang === "en" ? o.lang : DEFAULT_PREFS.lang,
    textScale: (TEXT_SCALES as readonly unknown[]).includes(o.textScale) ? (o.textScale as TextScale) : DEFAULT_PREFS.textScale,
    contrast: typeof o.contrast === "boolean" ? o.contrast : DEFAULT_PREFS.contrast,
    reduceMotion: typeof o.reduceMotion === "boolean" ? o.reduceMotion : DEFAULT_PREFS.reduceMotion,
    slowVoice: typeof o.slowVoice === "boolean" ? o.slowVoice : DEFAULT_PREFS.slowVoice,
  };
}

/** What to set on <html> so CSS can react. */
export function htmlAttributes(p: Prefs): { contrast: "high" | "normal"; motion: "reduce" | "auto"; scale: string } {
  return { contrast: p.contrast ? "high" : "normal", motion: p.reduceMotion ? "reduce" : "auto", scale: String(p.textScale) };
}
