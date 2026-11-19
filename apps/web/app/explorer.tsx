"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Language } from "@voteguard/shared";
import { optionsFor, searchUnits } from "../lib/units";
import { statusCopy } from "../lib/status-copy";
import { statusForUnit } from "../lib/demo";

export function Explorer() {
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [ward, setWard] = useState("");
  const [query, setQuery] = useState("");
  const [lang, setLang] = useState<Language>("en");

  const opts = useMemo(() => optionsFor({ state: state || undefined, lga: lga || undefined }), [state, lga]);
  const results = useMemo(
    () => searchUnits({ state: state || undefined, lga: lga || undefined, ward: ward || undefined, query }),
    [state, lga, ward, query],
  );
  const shown = results.slice(0, 30);

  return (
    <>
      <div className="row">
        <label className="field"><span>State</span>
          <select value={state} onChange={(e) => { setState(e.target.value); setLga(""); setWard(""); }}>
            <option value="">All</option>{opts.states.map((s) => <option key={s}>{s}</option>)}
          </select></label>
        <label className="field"><span>LGA</span>
          <select value={lga} disabled={!state} onChange={(e) => { setLga(e.target.value); setWard(""); }}>
            <option value="">All</option>{opts.lgas.map((s) => <option key={s}>{s}</option>)}
          </select></label>
        <label className="field"><span>Ward</span>
          <select value={ward} disabled={!lga} onChange={(e) => setWard(e.target.value)}>
            <option value="">All</option>{opts.wards.map((s) => <option key={s}>{s}</option>)}
          </select></label>
      </div>
      <label className="field"><span>Unit code or name</span>
        <input type="search" placeholder="e.g. LA-IKJ-04-012 or Ikeja Primary" value={query} onChange={(e) => setQuery(e.target.value)} /></label>

      <div className="lang" role="group" aria-label="Language">
        <button aria-pressed={lang === "en"} onClick={() => setLang("en")}>English</button>
        <button aria-pressed={lang === "pcm"} onClick={() => setLang("pcm")}>Pidgin</button>
      </div>
      <p className="muted" role="status">{results.length} unit{results.length === 1 ? "" : "s"}{results.length > shown.length ? ` (showing ${shown.length})` : ""}</p>

      {shown.map((u) => {
        const c = statusCopy(statusForUnit(u.code), lang);
        const status = statusForUnit(u.code);
        return (
          <div className="card" key={u.id}>
            <h3>{u.name} <span className="muted">· {u.code}</span></h3>
            <div className="muted">{u.ward} · {u.lga} · {u.state}</div>
            <p style={{ margin: "6px 0" }}><span className={`pill ${status}`}>{c.icon} {c.label}</span> <span className="muted">{c.sentence}</span></p>
            <div className="actions"><Link className="btn alt" href={`/capture?unit=${encodeURIComponent(u.code)}`}>Capture a sheet</Link></div>
          </div>
        );
      })}
      {results.length === 0 && <p className="muted">No units match. Try fewer filters.</p>}
    </>
  );
}
