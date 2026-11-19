"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { sha256 } from "@voteguard/evidence";
import { units } from "../../lib/units";
import { addToQueue } from "../../lib/queue";
import { useApp } from "../providers";

export function CaptureForm() {
  const params = useSearchParams();
  const { online, session, queue, refreshQueue, syncNow, syncing, syncMessage, receipts } = useApp();
  const [code, setCode] = useState(params.get("unit") ?? "");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ sha: string; at: string } | null>(null);
  const [error, setError] = useState("");
  const unit = units.find((u) => u.code === code);

  async function onFile(file: File | undefined) {
    if (!file || !unit) return;
    setBusy(true); setError("");
    try {
      const bytes = await file.arrayBuffer();
      const hash = await sha256(bytes);
      const at = new Date().toISOString();
      await addToQueue({ unitCode: unit.code, fileName: file.name, mimeType: file.type || "image/jpeg", bytes, sha256: hash, capturedAt: at });
      setLast({ sha: hash, at });
      await refreshQueue(); // the app uploads in the background when online and signed in
    } catch {
      setError("Could not save this photo on the phone. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <>
      {!session.loading && !session.email && (
        <div className="callout">You are not signed in. You can still take photos: they wait on this phone. <Link href="/signin?next=/capture">Sign in</Link> to upload them.</div>
      )}

      <label className="field"><span>Polling unit</span>
        <select value={code} onChange={(e) => { setCode(e.target.value); setLast(null); }}>
          <option value="">Choose a unit…</option>
          {units.map((u) => <option key={u.id} value={u.code}>{u.code} · {u.name}</option>)}
        </select></label>

      {unit ? (
        <div className="card"><h3>Is this the right unit?</h3>
          <div><b>{unit.name}</b> · {unit.code}</div>
          <div className="muted">{unit.ward} · {unit.lga} · {unit.state}</div></div>
      ) : <p className="muted">Choose a polling unit to continue.</p>}

      <p><span className="pill" role="status">{online ? "● Online" : "● Offline: saved on this phone"}</span></p>

      <label className="field"><span>Photo of the result sheet</span>
        <input type="file" accept="image/*" capture="environment" disabled={!unit || busy} onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} /></label>
      <p className="muted">Fit the whole sheet in the photo, in good light.</p>
      {error && <p role="alert" className="error">{error}</p>}

      {last && (
        <div className="card"><h3>Saved on this phone</h3>
          <div>Fingerprint taken <b>{new Date(last.at).toLocaleTimeString()}</b></div>
          <code>{last.sha}</code>
          <div className="tip">This shows the photo has not changed since it was captured. It does not prove the document was genuine.</div></div>
      )}

      {syncMessage && <div className="callout" role="status">{syncMessage}</div>}

      <h2 className="h2">Waiting to upload ({queue.length})</h2>
      {queue.length === 0 && <p className="muted">Nothing waiting.</p>}
      {queue.map((q) => (
        <div className="card" key={q.id}>
          <b>{q.unitCode}</b> <span className="pill">{syncing ? "⬆ uploading" : "⏳ waiting"}</span>
          <div className="muted">{q.fileName} · <code>{q.sha256.slice(0, 12)}…</code></div>
        </div>
      ))}
      {queue.length > 0 && session.email && online && <button className="btn small" disabled={syncing} onClick={() => void syncNow()}>{syncing ? "Uploading…" : "Upload now"}</button>}

      <h2 className="h2">Receipts</h2>
      {receipts.length === 0 && <p className="muted">Uploaded photos appear here with their fingerprint.</p>}
      {receipts.map((r) => (
        <div className="card" key={r.submissionId}>
          <b>{r.unitCode}</b> <span className="pill two_people_agree">✓ Uploaded</span>
          <div className="muted">Sent {new Date(r.syncedAt).toLocaleString()}</div>
          <code>{r.sha256}</code>
          <div className="actions">
            <Link className="btn small" href={`/submission/${r.submissionId}`}>Check the figures</Link>
            <Link className="btn small alt" href={`/unit/${encodeURIComponent(r.unitCode)}`}>See the record</Link>
          </div>
        </div>
      ))}
    </>
  );
}
