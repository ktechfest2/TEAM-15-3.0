"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "../app/providers";
import { GUIDE_LANGS, isChecked } from "../lib/guide/langs";
import { NAV, SECTIONS, TABS, activeSection } from "../lib/guide/sections";
import { t } from "../lib/guide/ui";

/** The black strip that is on every screen: this is a demo and not an official or news source. */
export function DemoStrip() {
  const { prefs } = useApp();
  return <div className="demo-strip" role="note">{t(prefs.lang, "banner")}</div>;
}

export function Masthead() {
  const { session, signOut, online, queue, prefs } = useApp();
  return (
    <header className="mast">
      <Link href="/candidates" className="logo"><span className="logo-mark" aria-hidden="true">VG</span>VOTE-GUARD 360</Link>
      <div className="mast-tools">
        <Link href="/settings">{t(prefs.lang, "nav.settings")}</Link>
        <Link href="/capture">{queue.length ? `Capture (${queue.length})` : "Capture"}</Link>
        {session.role === "reviewer" && <Link href="/review">Review</Link>}
        {session.loading ? null : session.email
          ? <button className="linklike" onClick={() => void signOut()} aria-label={`Sign out ${session.email}`}>Sign out</button>
          : <Link href="/signin">Sign in</Link>}
        {!online && <span className="pill offline" role="status">Offline</span>}
      </div>
      <div className="langbar" role="group" aria-label={t(prefs.lang, "lang.label")}>
        {GUIDE_LANGS.map((l) => <LangChip key={l.code} code={l.code} name={l.name} />)}
      </div>
    </header>
  );
}

function LangChip({ code, name }: { code: (typeof GUIDE_LANGS)[number]["code"]; name: string }) {
  const { prefs, setPrefs } = useApp();
  return <button aria-pressed={prefs.lang === code} lang={code} onClick={() => setPrefs({ lang: code })}>{name}</button>;
}

export function DraftNote() {
  const { prefs } = useApp();
  if (isChecked(prefs.lang)) return null;
  return <p className="draft-note" role="note">{t(prefs.lang, "draft")}</p>;
}

export function SectionBar() {
  const { prefs } = useApp();
  const active = activeSection(usePathname());
  return (
    <nav className="sections" aria-label="Sections">
      {NAV.map((id) => {
        const s = SECTIONS.find((x) => x.id === id)!;
        return <Link key={id} href={s.href} aria-current={active === id ? "page" : undefined}>{t(prefs.lang, s.labelKey)}</Link>;
      })}
    </nav>
  );
}

export function TabBar() {
  const { prefs, queue } = useApp();
  const active = activeSection(usePathname());
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((id) => {
        const s = SECTIONS.find((x) => x.id === id)!;
        return (
          <Link key={id} href={s.href} aria-current={active === id ? "page" : undefined}>
            <i aria-hidden="true" />
            {t(prefs.lang, s.labelKey)}{id === "unit" && queue.length ? ` (${queue.length})` : ""}
          </Link>
        );
      })}
    </nav>
  );
}

export function SkipLink() {
  const { prefs } = useApp();
  return <a className="skip" href="#main">{t(prefs.lang, "skip")}</a>;
}
