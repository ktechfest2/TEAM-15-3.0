import { describe, it, expect } from "vitest";
import { GUIDE_LANGS, isGuideLang, isChecked, evidenceLang, langLabel, htmlLang } from "../../lib/guide/langs";
import { parsePrefs, DEFAULT_PREFS } from "../../lib/client/prefs";
import { pickVoice } from "../../lib/client/speech";

describe("guide languages", () => {
  it("offers English, Pidgin, Hausa, Yoruba and Igbo in that order", () => {
    expect(GUIDE_LANGS.map((l) => l.code)).toEqual(["en", "pcm", "ha", "yo", "ig"]);
  });
  it("recognises only those codes", () => {
    expect(isGuideLang("ha")).toBe(true);
    expect(isGuideLang("fr")).toBe(false);
    expect(isGuideLang(5)).toBe(false);
  });
  it("marks every language except English as awaiting a native-speaker check", () => {
    expect(isChecked("en")).toBe(true);
    for (const c of ["pcm", "ha", "yo", "ig"] as const) expect(isChecked(c)).toBe(false);
  });
  it("shows each language by its own name", () => {
    expect(langLabel("yo")).toBe("Yorùbá");
    expect(langLabel("ig")).toBe("Igbo");
    expect(langLabel("ha")).toBe("Hausa");
    expect(langLabel("pcm")).toBe("Pidgin");
  });
  it("maps to the evidence language: Pidgin stays Pidgin, the rest fall back to English", () => {
    expect(evidenceLang("pcm")).toBe("pcm");
    expect(evidenceLang("en")).toBe("en");
    expect(evidenceLang("ha")).toBe("en");
    expect(evidenceLang("yo")).toBe("en");
    expect(evidenceLang("ig")).toBe("en");
  });
  it("sets a valid html lang code", () => {
    expect(htmlLang("ha")).toBe("ha");
    expect(htmlLang("yo")).toBe("yo");
    expect(htmlLang("ig")).toBe("ig");
    expect(htmlLang("pcm")).toBe("pcm");
  });
  it("saved preferences accept the new languages and still reject junk", () => {
    expect(parsePrefs(JSON.stringify({ lang: "yo" })).lang).toBe("yo");
    expect(parsePrefs(JSON.stringify({ lang: "ig" })).lang).toBe("ig");
    expect(parsePrefs(JSON.stringify({ lang: "xx" })).lang).toBe(DEFAULT_PREFS.lang);
  });
  it("never speaks a Hausa, Yoruba or Igbo sentence with an English voice", () => {
    const en = { lang: "en-GB", name: "x" } as SpeechSynthesisVoice;
    expect(pickVoice([en], "ha")).toBeNull();
    expect(pickVoice([en], "yo")).toBeNull();
    expect(pickVoice([en], "ig")).toBeNull();
    const yo = { lang: "yo-NG", name: "y" } as SpeechSynthesisVoice;
    expect(pickVoice([en, yo], "yo")).toBe(yo);
  });
});
