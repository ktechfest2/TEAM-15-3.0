"use client";

import { TEXT_SCALES } from "../../lib/client/prefs";
import { useApp } from "../providers";

export default function SettingsPage() {
  const { prefs, setPrefs } = useApp();
  return (
    <>
      <h1>Accessibility</h1>
      <p className="sub">These settings stay on this phone. Nothing is sent anywhere.</p>

      <fieldset className="card"><legend>Language</legend>
        <div className="lang" role="group" aria-label="Language">
          <button aria-pressed={prefs.lang === "en"} onClick={() => setPrefs({ lang: "en" })}>English</button>
          <button aria-pressed={prefs.lang === "pcm"} onClick={() => setPrefs({ lang: "pcm" })}>Pidgin</button>
        </div>
        <p className="muted">Pidgin is shown as text. Spoken audio is English only, because phones do not have a Pidgin voice.</p>
      </fieldset>

      <fieldset className="card"><legend>Text size</legend>
        <div className="lang" role="group" aria-label="Text size">
          {TEXT_SCALES.map((s, i) => (
            <button key={s} aria-pressed={prefs.textScale === s} onClick={() => setPrefs({ textScale: s })} style={{ fontSize: `${1 + i * 0.25}rem` }}>
              {["Normal", "Large", "Extra large"][i]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="card"><legend>Display and sound</legend>
        <label className="check"><input type="checkbox" checked={prefs.contrast} onChange={(e) => setPrefs({ contrast: e.target.checked })} /> High contrast</label>
        <label className="check"><input type="checkbox" checked={prefs.reduceMotion} onChange={(e) => setPrefs({ reduceMotion: e.target.checked })} /> Reduce motion</label>
        <label className="check"><input type="checkbox" checked={prefs.slowVoice} onChange={(e) => setPrefs({ slowVoice: e.target.checked })} /> Slower voice when listening</label>
      </fieldset>

      <p className="muted">Every screen works with a keyboard and a screen reader. Use “Skip to content” at the top of any page.</p>
    </>
  );
}
