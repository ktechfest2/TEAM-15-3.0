"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { validateArithmetic } from "@voteguard/evidence";
import { ApiError } from "../../../lib/client/api";
import { fieldRows, fromInputs, toInputs, type FigureInputs } from "../../../lib/client/labels";
import type { ExtractionSummary } from "../../../lib/server/extract";
import { StatusLine } from "../../../components/status-pill";
import { units } from "../../../lib/units";
import { useApp } from "../../providers";

export function SubmissionReview({ id }: { id: string }) {
  const { api, session, prefs } = useApp();
  const [data, setData] = useState<ExtractionSummary | null>(null);
  const [inputs, setInputs] = useState<FigureInputs>({});
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<{ changed: string[]; status: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session.loading) return;
    if (!session.email) return;
    let live = true;
    api.extract(id).then((d) => { if (live) { setData(d); setInputs(toInputs(d.fields)); } })
      .catch((e) => { if (live) setError(e instanceof ApiError ? (e.status === 0 ? "You are offline. Try again when you have a signal." : e.message) : "Could not load this submission."); });
    return () => { live = false; };
  }, [api, id, session.loading, session.email]);

  const parsed = useMemo(() => fromInputs(inputs), [inputs]);
  const checks = useMemo(() => (parsed ? validateArithmetic(parsed).checks : null), [parsed]);
  const unit = units.find((u) => u.id === data?.polling_unit_id);

  if (session.loading) return <p className="muted" role="status">Loading…</p>;
  if (!session.email) return <><h1>Check the figures</h1><div className="callout">Please <Link href={`/signin?next=/submission/${id}`}>sign in</Link> to check your photo’s figures.</div></>;

  async function confirm() {
    if (!parsed) return;
    setBusy(true); setError("");
    try {
      const r = await api.confirm(id, parsed);
      setSaved({ changed: r.changed_fields, status: r.status });
    } catch (e) { setError(e instanceof ApiError ? e.message : "Could not save. Try again."); }
    finally { setBusy(false); }
  }

  const rows = data ? fieldRows(data.fields) : [];
  return (
    <>
      <h1>Check the figures</h1>
      <p className="sub">{unit ? `${unit.name} · ${unit.code}` : "Your uploaded photo"}</p>
      {error && <div className="callout" role="alert">{error}</div>}
      {!data && !error && <p className="muted" role="status">Reading the photo…</p>}

      {data && (
        <>
          <StatusLine status={data.status} lang={prefs.lang} />
          {!data.hash_match && <div className="callout" role="alert">The fingerprint of the stored photo does not match the one taken on your phone. A person will check this photo.</div>}
          {data.low_confidence && <div className="callout" role="status">Some figures could not be read clearly. Please check them against the paper sheet.</div>}

          <div className="photos">
            <div className="card photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.image_url} alt="Your photo of the result sheet" />
            </div>
            <div className="card">
              <h3>Figures read by a machine</h3>
              <p className="muted">Compare each number with the paper sheet. Fix any that are wrong, then confirm. Your changes are kept separately; the machine’s reading is never overwritten.</p>
              {rows.map((r) => {
                const low = data.low_fields.includes(r.key);
                const bad = inputs[r.key] !== undefined && parsed === null && Number.isNaN(Number((inputs[r.key] ?? "").trim() === "" ? 0 : inputs[r.key]));
                return (
                  <label className="field" key={r.key}>
                    <span>{r.label}{low && <> <span className="flag">check</span></>}</span>
                    <input type="text" inputMode="numeric" value={inputs[r.key] ?? ""} aria-invalid={bad} placeholder="missing"
                      onChange={(e) => setInputs((old) => ({ ...old, [r.key]: e.target.value }))} />
                  </label>
                );
              })}
            </div>
          </div>

          <h2 className="h2">Do the numbers add up?</h2>
          {checks === null ? <p className="callout" role="status">Use whole numbers only (or leave blank if the sheet is blank).</p> : (
            <ul>{checks.map((c) => <li key={c.rule} className={c.ok ? "ok" : "flag"}>{c.ok ? "✓" : "✗"} {c.message}</li>)}</ul>
          )}

          <div className="actions">
            <button className="btn" disabled={busy || parsed === null} onClick={() => void confirm()}>{busy ? "Saving…" : "These match the sheet: confirm"}</button>
            {unit && <Link className="btn alt" href={`/unit/${encodeURIComponent(unit.code)}`}>See the record</Link>}
          </div>
          {saved && (
            <div className="callout good" role="status">
              Saved. {saved.changed.length ? `You changed: ${saved.changed.join(", ")}.` : "You confirmed the figures as read."} {unit && <Link href={`/unit/${encodeURIComponent(unit.code)}`}>See the record</Link>}
            </div>
          )}
        </>
      )}
    </>
  );
}
