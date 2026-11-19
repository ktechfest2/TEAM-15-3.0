"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Status } from "@voteguard/shared";
import { STATUSES, statusCopy } from "../../lib/status-copy";
import type { AuditVerification } from "../../lib/server/audit-verify";
import type { DashboardResponse } from "../../lib/client/api";
import { useApp } from "../providers";

type Ward = DashboardResponse["wards"][number];

function WardCard({ w, lang }: { w: Ward; lang: "en" | "pcm" }) {
  const total = w.units_total || 1;
  const diff = w.comparable && w.counted && w.published ? w.counted.valid! - w.published.valid : null;
  return (
    <div className="card">
      <h3>{w.ward} · {w.lga} · {w.state}</h3>
      <div className="bar" role="img" aria-label={STATUSES.map((s) => `${statusCopy(s, lang).label}: ${w.counts[s]}`).join(", ")}>
        {STATUSES.map((s) => w.counts[s] > 0 && <span key={s} className={`s-${s}`} style={{ width: `${(w.counts[s] / total) * 100}%` }} />)}
      </div>
      <div className="muted">{STATUSES.filter((s) => w.counts[s] > 0).map((s) => `${w.counts[s]} ${statusCopy(s, lang).label.toLowerCase()}`).join(" · ")} · {w.units_total} units</div>
      <h4 style={{ margin: "10px 0 4px" }}>Collation tracker</h4>
      <div>Units where two independent photos agree: <b>{w.counted_units} of {w.units_total}</b></div>
      {w.counted && <div>Valid votes in those units: <b>{w.counted.valid!.toLocaleString()}</b></div>}
      {w.published && <div>Published ward figure (<i>{w.published.source}</i>): <b>{w.published.valid.toLocaleString()}</b> valid votes</div>}
      {w.published && (w.comparable
        ? <p className="callout">All units are counted. The photo-based total is {Math.abs(diff!).toLocaleString()} {diff! >= 0 ? "above" : "below"} the published figure{diff === 0 ? " (they match)" : ""}. This is a difference to look into, not a finding.</p>
        : <p className="muted">Not comparable yet: the two totals can be set side by side only when every unit in the ward has two agreeing photos.</p>)}
    </div>
  );
}

export default function DashboardPage() {
  const { api, prefs } = useApp();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [chain, setChain] = useState<AuditVerification | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    api.dashboard().then((d) => live && setData(d)).catch(() => live && setError("The dashboard could not be loaded. Check your connection and try again."));
    api.audit().then((a) => live && setChain(a)).catch(() => {});
    return () => { live = false; };
  }, [api]);

  const lang = prefs.lang;
  return (
    <>
      <h1>Public dashboard</h1>
      <p className="sub">What the photos show so far. Synthetic demo data. This is not an official result and never names a winner.</p>
      {error && <div className="callout" role="alert">{error}</div>}
      {!data && !error && <p className="muted" role="status">Loading…</p>}
      {data && (
        <>
          <div className="chips" role="list" aria-label="Units by status">
            {STATUSES.map((s: Status) => (
              <div className="chip" role="listitem" key={s}><b>{data.totals[s]}</b>{statusCopy(s, lang).icon} {statusCopy(s, lang).label}</div>
            ))}
          </div>
          <p className="muted">{data.units_total} demo polling units in total.</p>
          <h2 className="h2">Wards with activity</h2>
          {data.wards.length === 0 && <p className="muted">No photos yet. <Link href="/capture">Capture a sheet</Link></p>}
          {data.wards.map((w) => <WardCard key={`${w.state}${w.lga}${w.ward}`} w={w} lang={lang} />)}
          {chain && (
            <p className={chain.ok ? "callout good" : "callout"} role="status">
              {chain.ok ? `The audit record has ${chain.count} steps and every one links to the one before it.` : `The audit record does not link correctly at step ${(chain.broken_at ?? 0) + 1}.`}
            </p>
          )}
        </>
      )}
    </>
  );
}
