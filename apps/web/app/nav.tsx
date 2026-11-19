"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "./providers";

export function Nav() {
  const { session, signOut, online, queue, prefs, setPrefs } = useApp();
  const path = usePathname();
  const link = (href: string, label: string) => (
    <Link href={href} aria-current={path === href || (href !== "/" && path.startsWith(href)) ? "page" : undefined}>{label}</Link>
  );
  return (
    <header className="top">
      <Link href="/" className="brand">VOTE-GUARD 360</Link>
      <nav aria-label="Main">
        {link("/", "Explore")}
        {link("/capture", queue.length ? `Capture (${queue.length})` : "Capture")}
        {link("/dashboard", "Dashboard")}
        {session.role === "reviewer" && link("/review", "Review")}
        {link("/settings", "Settings")}
        {session.loading ? null : session.email
          ? <button className="linklike" onClick={() => void signOut()} aria-label={`Sign out ${session.email}`}>Sign out</button>
          : link("/signin", "Sign in")}
      </nav>
      <div className="top-tools">
        <div className="lang" role="group" aria-label="Language">
          <button aria-pressed={prefs.lang === "en"} onClick={() => setPrefs({ lang: "en" })}>EN</button>
          <button aria-pressed={prefs.lang === "pcm"} onClick={() => setPrefs({ lang: "pcm" })}>Pidgin</button>
        </div>
        {!online && <span className="pill offline" role="status">Offline</span>}
      </div>
    </header>
  );
}
