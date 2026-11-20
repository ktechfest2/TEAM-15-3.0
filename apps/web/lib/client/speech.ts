import type { GuideLang } from "../guide/langs";

/**
 * Choose a voice for the language, or null. We never fake audio: if no suitable voice exists the
 * app shows the text instead. No device ships a Pidgin voice, so Pidgin is text only for now.
 */
export function pickVoice(voices: SpeechSynthesisVoice[], lang: GuideLang): SpeechSynthesisVoice | null {
  if (lang !== "en") return voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ?? null;
  return (
    voices.find((v) => v.lang.toLowerCase() === "en-ng") ??
    voices.find((v) => v.lang.toLowerCase().startsWith("en")) ??
    null
  );
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

/** Voices load late in some browsers, so wait briefly for them. */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!canSpeak()) return resolve([]);
    const now = window.speechSynthesis.getVoices();
    if (now.length) return resolve(now);
    const done = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 800);
  });
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}

/** Speak text. Resolves false when there is no voice (caller keeps showing the text). */
export async function speak(text: string, lang: GuideLang, slow: boolean, onEnd?: () => void): Promise<boolean> {
  if (!canSpeak()) return false;
  const voice = pickVoice(await loadVoices(), lang);
  if (!voice) return false;
  stopSpeaking();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = slow ? 0.75 : 1;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
  return true;
}
