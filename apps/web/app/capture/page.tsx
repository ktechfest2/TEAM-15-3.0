import { Suspense } from "react";
import { CaptureForm } from "./capture-form";

export default function CapturePage() {
  return (
    <>
      <h1>Capture a result sheet</h1>
      <p className="sub">Works with no signal. The fingerprint is taken on this phone the moment you choose a photo.</p>
      <Suspense fallback={<p className="muted">Loading…</p>}><CaptureForm /></Suspense>
    </>
  );
}
