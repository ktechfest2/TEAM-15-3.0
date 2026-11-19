"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "../providers";

function SignInForm() {
  const { signIn, session } = useApp();
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/capture";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const problem = await signIn(email, password);
    setBusy(false);
    if (problem) setError(problem);
    else router.push(next.startsWith("/") ? next : "/capture");
  }

  if (session.email) {
    return (
      <div className="card">
        <h3>You are signed in</h3>
        <p className="muted">{session.email} · {session.role === "reviewer" ? "Reviewer" : "Observer"}</p>
        <div className="actions"><button className="btn" onClick={() => router.push("/capture")}>Go to Capture</button></div>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="card" aria-describedby="why">
      <p id="why" className="muted">Observers and reviewers sign in so every photo is tied to a person. Public pages need no sign-in, and the public never sees who sent what.</p>
      <label className="field"><span>Email</span>
        <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label className="field"><span>Password</span>
        <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      {error && <p role="alert" className="error">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

export default function SignInPage() {
  return (
    <>
      <h1>Sign in</h1>
      <p className="sub">For observers who send photos and reviewers who check them.</p>
      <Suspense fallback={<p className="muted">Loading…</p>}><SignInForm /></Suspense>
    </>
  );
}
