"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Status } from "@voteguard/shared";
import { optionsFor, searchUnits } from "../lib/units";
import { statusCopy } from "../lib/status-copy";
import { StatusPill } from "../components/status-pill";
import { useApp } from "./providers";
import { evidenceLang } from "../lib/guide/langs";

export function Explorer() {
  const { api, prefs } = useApp();
  const lang = evidenceLang(prefs.lang);
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [ward, setWard] = useState("");
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<Record<string, Status> | null>(null);

  // Units are bundled so this page works offline; live statuses come from the server when reachable.
  useEffect(() => {
    let live = true;
    api.units({}).then((r) => { if (live) setStatuses(Object.fromEntries(r.units.map((u) => [u.code, u.status]))); }).catch(() => { if (live) setStatuses(null); });
    return () => { live = false; };
  }, [api]);

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

      <p className="muted" role="status">{results.length} unit{results.length === 1 ? "" : "s"}{results.length > shown.length ? ` (showing ${shown.length})` : ""}{statuses === null ? " · status unavailable right now" : ""}</p>

      {shown.map((u) => {
        const status = statuses?.[u.code];
        return (
          <div className="card" key={u.id}>
            <h3>{u.name} <span className="muted">· {u.code}</span></h3>
            <div className="muted">{u.ward} · {u.lga} · {u.state}</div>
            {status && <p className="status-line"><StatusPill status={status} lang={lang} /> <span className="muted">{statusCopy(status, lang).sentence}</span></p>}
            <div className="actions">
              <Link className="btn small" href={`/unit/${encodeURIComponent(u.code)}`}>View evidence</Link>
              <Link className="btn small alt" href={`/capture?unit=${encodeURIComponent(u.code)}`}>Capture a sheet</Link>
            </div>
          </div>
        );
      })}
      {results.length === 0 && <p className="muted">No units match. Try fewer filters.</p>}
    </>
  );
}
