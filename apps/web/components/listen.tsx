"use client";

import { useEffect, useState } from "react";
import type { GuideLang } from "../lib/guide/langs";
import { langLabel } from "../lib/guide/langs";
import { canSpeak, loadVoices, pickVoice, speak, stopSpeaking } from "../lib/client/speech";

/**
 * A1: "Listen to this result sheet". Reads the plain-language text aloud. The text is always shown
 * as well. If the device has no voice for the language we say so and show text only, never fake audio.
 */
export function Listen({ text, lang, slow, label }: { text: string; lang: GuideLang; slow: boolean; label?: string }) {
  const [state, setState] = useState<"idle" | "speaking" | "novoice">("idle");
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    let live = true;
    if (!canSpeak()) { setSupported(false); return; }
    loadVoices().then((v) => { if (live) setSupported(pickVoice(v, lang) !== null); });
    return () => { live = false; stopSpeaking(); };
  }, [lang]);

  async function toggle() {
    if (state === "speaking") { stopSpeaking(); setState("idle"); return; }
    const ok = await speak(text, lang, slow, () => setState("idle"));
    setState(ok ? "speaking" : "novoice");
  }

  if (supported === false || state === "novoice") {
    return <p className="muted" role="status">{lang === "en" ? "This device has no voice for listening, so the words are shown above." : `No ${langLabel(lang)} voice on this phone, so the words are shown above. Switch to English to listen.`}</p>;
  }
  return (
    <button className="btn alt" onClick={toggle} aria-pressed={state === "speaking"} disabled={supported === null || !text}>
      <span aria-hidden="true">{state === "speaking" ? "⏹" : "🔊"}</span> {state === "speaking" ? "Stop" : (label ?? "Listen to this result sheet")}
    </button>
  );
}
