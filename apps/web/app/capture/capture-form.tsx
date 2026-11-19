"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { sha256 } from "@voteguard/evidence";
import { units } from "../../lib/units";
import { addToQueue, listQueue, type QueueItem } from "../../lib/queue";

export function CaptureForm() {
  const params = useSearchParams();
  const [code, setCode] = useState(params.get("unit") ?? "");
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ sha: string; at: string } | null>(null);
  const [error, setError] = useState("");
  const unit = units.find((u) => u.code === code);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    listQueue().then(setQueue).catch(() => {});
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  async function onFile(file: File | undefined) {
    if (!file || !unit) return;
    setBusy(true); setError("");
    try {
      const bytes = await file.arrayBuffer();
      const hash = await sha256(bytes);
      const at = new Date().toISOString();
      await addToQueue({ unitCode: unit.code, fileName: file.name, mimeType: file.type || "image/jpeg", bytes, sha256: hash, capturedAt: at });
      setLast({ sha: hash, at });
      setQueue(await listQueue());
    } catch (e) {
      setError("Could not save this photo on the phone. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <>
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
        <input type="file" accept="image/*" capture="environment" disabled={!unit || busy} onChange={(e) => onFile(e.target.files?.[0])} /></label>
      <p className="muted">Fit the whole sheet in the photo, in good light.</p>
      {error && <p role="alert" style={{ color: "var(--bad)" }}>{error}</p>}

      {last && (
        <div className="card"><h3>Saved on this phone</h3>
          <div>Fingerprint taken <b>{new Date(last.at).toLocaleTimeString()}</b></div>
          <code>{last.sha}</code>
          <div className="tip">This shows the photo has not changed since it was captured. It does not prove the document was genuine.</div></div>
      )}

      <h2 style={{ fontSize: "1.1rem", color: "var(--navy)" }}>Waiting to upload ({queue.length})</h2>
      {queue.length === 0 && <p className="muted">Nothing waiting.</p>}
      {queue.map((q) => (
        <div className="card" key={q.id}><b>{q.unitCode}</b> <span className="pill">⏳ waiting</span>
          <div className="muted">{q.fileName} · <code>{q.sha256.slice(0, 12)}…</code></div></div>
      ))}
      <p className="muted">Uploading to the server is added once the database is ready.</p>
    </>
  );
}
