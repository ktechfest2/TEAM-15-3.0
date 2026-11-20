"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublicUnit } from "../../lib/server/read";
import { statusCopy } from "../../lib/status-copy";
import { StatusPill } from "../../components/status-pill";
import { useApp } from "../providers";
import { evidenceLang } from "../../lib/guide/langs";

export default function ReviewConsole() {
  const { api, session, prefs } = useApp();
  const [units, setUnits] = useState<PublicUnit[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session.role !== "reviewer") return;
    let live = true;
    api.units({}).then((r) => live && setUnits(r.units)).catch(() => live && setError("The queue could not be loaded."));
    return () => { live = false; };
  }, [api, session.role]);

  if (session.loading) return <p className="muted" role="status">Loading…</p>;
  if (session.role !== "reviewer") return <><h1>Reviewer console</h1><div className="callout">This page is for reviewers. <Link href="/signin?next=/review">Sign in as a reviewer</Link>.</div></>;

  const todo = (units ?? []).filter((u) => u.status === "disputed" || u.status === "needs_human_review");
  const done = (units ?? []).filter((u) => u.status === "reviewed");
  return (
    <>
      <h1>Reviewer console</h1>
      <p className="sub">Units that need a person to look. Open one to see the photos side by side and record a decision.</p>
      {error && <div className="callout" role="alert">{error}</div>}
      {!units && !error && <p className="muted" role="status">Loading the queue…</p>}
      {units && (
        <>
          <h2 className="h2">Needs review ({todo.length})</h2>
          {todo.length === 0 && <p className="muted">Nothing is waiting for review.</p>}
          {todo.map((u) => (
            <div className="card" key={u.id}>
              <h3>{u.name} <span className="muted">· {u.code}</span></h3>
              <p className="status-line"><StatusPill status={u.status} lang={evidenceLang(prefs.lang)} /> <span className="muted">{statusCopy(u.status, evidenceLang(prefs.lang)).sentence}</span></p>
              <Link className="btn small" href={`/unit/${encodeURIComponent(u.code)}`}>Open and decide</Link>
            </div>
          ))}
          <h2 className="h2">Already reviewed ({done.length})</h2>
          {done.map((u) => <div className="card" key={u.id}><b>{u.name}</b> · {u.code} <Link href={`/unit/${encodeURIComponent(u.code)}`}>View</Link></div>)}
        </>
      )}
    </>
  );
}
