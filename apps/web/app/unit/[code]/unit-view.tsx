"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { units } from "../../../lib/units";
import { ApiError, type EvidenceResponse, type NarrationResponse } from "../../../lib/client/api";
import { DECISION_KEYS, decisionLabel, differingKeys, eventSentence, fieldRows } from "../../../lib/client/labels";
import type { AuditVerification } from "../../../lib/server/audit-verify";
import { StatusLine } from "../../../components/status-pill";
import { Listen } from "../../../components/listen";
import { useApp } from "../../providers";
import { evidenceLang } from "../../../lib/guide/langs";
import { PlanCard } from "../../../components/my-unit";

const FINGERPRINT_TIP = "This fingerprint shows the photo has not changed since it was captured. It does not prove the document was genuine.";

export function UnitView({ code }: { code: string }) {
  const { api, prefs, session } = useApp();
  const unit = units.find((u) => u.code === code);
  const [evidence, setEvidence] = useState<EvidenceResponse | null>(null);
  const [narration, setNarration] = useState<NarrationResponse | null>(null);
  const [error, setError] = useState("");
  const [chain, setChain] = useState<AuditVerification | "loading" | "failed" | null>(null);

  const load = useCallback(async () => {
    if (!unit) return;
    try {
      const [ev, nar] = await Promise.all([api.evidence(unit.id), api.narration(unit.id, evidenceLang(prefs.lang))]);
      setEvidence(ev); setNarration(nar); setError("");
    } catch (e) {
      setError(e instanceof ApiError && e.status === 0 ? "You are offline, so the latest record cannot be loaded. Try again when you have a signal." : "The record could not be loaded. Please try again.");
    }
  }, [api, unit, evidenceLang(prefs.lang)]);
  useEffect(() => { void load(); }, [load]);

  async function verify() {
    setChain("loading");
    try { setChain(await api.audit()); } catch { setChain("failed"); }
  }

  if (!unit) return <><h1>Unknown unit</h1><p className="muted">There is no demo polling unit with the code “{code}”. <Link href="/">Back to the explorer</Link></p></>;

  const subs = evidence?.submissions ?? [];
  const diff = differingKeys(subs.map((s) => s.fields));
  const rowKeys = subs.length ? fieldRows(subs[0]!.fields).map((r) => ({ key: r.key, label: r.label })) : [];
  const extraKeys = [...new Set(subs.flatMap((s) => fieldRows(s.fields).map((r) => r.key)))].filter((k) => !rowKeys.some((r) => r.key === k)).map((k) => ({ key: k, label: k }));
  const allRows = [...rowKeys, ...extraKeys];
  const valueOf = (s: (typeof subs)[number], key: string) => fieldRows(s.fields).find((r) => r.key === key)?.value;

  return (
    <>
      <h1>{unit.name}</h1>
      <p className="sub">{unit.code} · {unit.ward} · {unit.lga} · {unit.state}</p>

      <PlanCard unitCode={unit.code} unitName={unit.name} status={evidence?.status ?? null} />

      {error && <div className="callout" role="alert">{error}</div>}
      {!evidence && !error && <p className="muted" role="status">Loading the record…</p>}

      {evidence && narration && (
        <>
          <StatusLine status={evidence.status} lang={evidenceLang(prefs.lang)} />
          <div className="card">
            <h3>In plain words</h3>
            <p style={{ fontSize: "1.1rem", margin: "6px 0" }}>{narration.text}</p>
            <Listen text={narration.text} lang={evidenceLang(prefs.lang)} slow={prefs.slowVoice} />
          </div>

          {evidence.pending > 0 && <p className="muted">{evidence.pending} photo{evidence.pending === 1 ? " is" : "s are"} uploaded and waiting to be read.</p>}
          {subs.length === 0 && <div className="card"><p className="muted" style={{ margin: 0 }}>No photos yet for this unit. <Link href={`/capture?unit=${encodeURIComponent(unit.code)}`}>Capture a sheet</Link></p></div>}

          {diff.size > 0 && (
            <div className="callout" role="status">
              Photos differ on: {[...diff].join(", ")}. This does not say which is right. A person will look at the photos.
            </div>
          )}

          {subs.length > 0 && (
            <>
              <h2 className="h2">{subs.length > 1 ? "Photos side by side" : "The photo"}</h2>
              <div className="photos">
                {subs.map((s, i) => (
                  <div className="card photo" key={s.id}>
                    <h3>Photo {i + 1}</h3>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.image_url} alt={`Photo ${i + 1} of the result sheet for ${unit.name}, taken ${new Date(s.captured_at).toLocaleString()}`} />
                    <p className="muted" style={{ margin: "6px 0" }}>Taken {new Date(s.captured_at).toLocaleString()}</p>
                    <div title={FINGERPRINT_TIP}>Fingerprint <code>{s.sha256.slice(0, 16)}…</code></div>
                    <div className={s.hash_match === false ? "flag" : "ok"}>{s.hash_match === false ? "⚠ Fingerprint changed after capture" : "✓ Server re-check matched"}</div>
                    <div className="tip">{FINGERPRINT_TIP}</div>
                  </div>
                ))}
              </div>

              <h2 className="h2">Figures</h2>
              <p className="muted">Read from the photos by a machine. {subs.some((s) => s.confirmed_by_observer) ? "Some were confirmed or corrected by the observer. " : ""}Anything marked “check” had low confidence.</p>
              <div className="scroll"><table className="figures">
                <thead><tr><th scope="col">Figure</th>{subs.map((_, i) => <th scope="col" className="num" key={i}>Photo {i + 1}</th>)}</tr></thead>
                <tbody>
                  {allRows.map((r) => (
                    <tr key={r.key} className={diff.has(r.key) ? "differs" : undefined}>
                      <th scope="row">{r.label}</th>
                      {subs.map((s) => {
                        const v = valueOf(s, r.key);
                        const low = s.low_fields.includes(r.key);
                        return <td className="num" key={s.id}>{v === null || v === undefined ? "missing" : v.toLocaleString()}{low && <> <span className="flag">check</span></>}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table></div>

              <h2 className="h2">Arithmetic checks</h2>
              {subs.map((s, i) => (
                <details className="card" key={s.id} open={!s.verified}>
                  <summary>Photo {i + 1}: {s.checks.every((c) => c.ok) ? "the numbers add up" : "some numbers do not add up"}</summary>
                  <ul>{s.checks.map((c) => <li key={c.rule} className={c.ok ? undefined : "flag"}>{c.ok ? "✓" : "✗"} {c.message}</li>)}</ul>
                </details>
              ))}
            </>
          )}

          {evidence.review_notes.length > 0 && (
            <>
              <h2 className="h2">Reviewer notes</h2>
              {evidence.review_notes.map((n, i) => (
                <div className="card" key={i}><b>{decisionLabel(n.decision)}</b><p style={{ margin: "4px 0" }}>{n.note}</p><span className="muted">{new Date(n.created_at).toLocaleString()}</span></div>
              ))}
            </>
          )}

          {session.role === "reviewer" && <ReviewPanel unitId={unit.id} onDone={load} />}

          <h2 className="h2">What happened, step by step</h2>
          {evidence.timeline.length === 0 ? <p className="muted">Nothing has happened yet.</p> : (
            <ol className="timeline">
              {evidence.timeline.map((e) => (
                <li key={e.hash}>
                  <time dateTime={e.created_at}>{new Date(e.created_at).toLocaleString()}</time>
                  {eventSentence(e.type, e.payload)}
                  <div className="muted" title="Each step is linked to the one before it, so changing history would break the chain.">link <code>{e.hash.slice(0, 10)}…</code></div>
                </li>
              ))}
            </ol>
          )}
          <p>
            <button className="btn small alt" onClick={() => void verify()} disabled={chain === "loading"}>{chain === "loading" ? "Checking…" : "Check that the record has not been changed"}</button>
          </p>
          {chain && chain !== "loading" && (
            chain === "failed"
              ? <p className="callout" role="status">The check could not run right now.</p>
              : chain.ok
                ? <p className="callout good" role="status">All {chain.count} steps in the whole record link correctly. Nothing has been changed or removed.</p>
                : <p className="callout" role="alert">The record does not link correctly at step {(chain.broken_at ?? 0) + 1}. A person should look.</p>
          )}
        </>
      )}
    </>
  );
}

function ReviewPanel({ unitId, onDone }: { unitId: string; onDone: () => Promise<void> }) {
  const { api } = useApp();
  const [decision, setDecision] = useState(DECISION_KEYS[0]!);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setMsg("");
    try {
      await api.review({ polling_unit_id: unitId, decision, note });
      setNote(""); setMsg("Decision recorded."); await onDone();
    } catch (e) { setMsg(e instanceof ApiError ? e.message : "Could not save. Try again."); }
    finally { setBusy(false); }
  }
  return (
    <div className="card">
      <h3>Reviewer decision</h3>
      <p className="muted">Your note is public. It never names you.</p>
      <label className="field"><span>Decision</span>
        <select value={decision} onChange={(e) => setDecision(e.target.value)}>{DECISION_KEYS.map((d) => <option key={d} value={d}>{decisionLabel(d)}</option>)}</select></label>
      <label className="field"><span>Public note (up to 500 characters)</span>
        <textarea value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} /></label>
      <button className="btn" disabled={busy || note.trim().length === 0} onClick={() => void submit()}>{busy ? "Saving…" : "Record decision"}</button>
      {msg && <p role="status" className="muted">{msg}</p>}
    </div>
  );
}
