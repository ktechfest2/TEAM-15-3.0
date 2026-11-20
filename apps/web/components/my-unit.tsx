"use client";

import { useEffect, useState } from "react";
import type { Status } from "@voteguard/shared";
import { buildIcs, VOTING_DATE } from "../lib/plan/ics";
import { FOLLOW_KEY, parseFollowed, rememberStatus, toggleFollow, whatChanged, type Followed } from "../lib/plan/follow";
import { statusCopy } from "../lib/status-copy";
import { evidenceLang } from "../lib/guide/langs";
import { t } from "../lib/guide/ui";
import { useApp } from "../app/providers";

const OFFICIAL_URL = "https://inecnigeria.org/elections/calendar";

/** Read and write the follow list on this phone. Nothing is sent anywhere. */
export function useFollowed(): [Followed, (f: Followed) => void] {
  const [f, setF] = useState<Followed>({});
  useEffect(() => { try { setF(parseFollowed(localStorage.getItem(FOLLOW_KEY))); } catch { /* blocked storage */ } }, []);
  const save = (next: Followed) => { setF(next); try { localStorage.setItem(FOLLOW_KEY, JSON.stringify(next)); } catch { /* memory only */ } };
  return [f, save];
}

export function PlanCard({ unitCode, unitName, status }: { unitCode: string; unitName: string; status: Status | null }) {
  const { prefs } = useApp();
  const l = prefs.lang;
  const [followed, save] = useFollowed();
  const [seen, setSeen] = useState<{ from: Status; to: Status } | null>(null);
  const isFollowing = unitCode in followed;

  // Work out what changed once, then remember what has been shown so it is not announced again.
  useEffect(() => {
    if (!status || !isFollowing) return;
    const c = whatChanged(followed, unitCode, status);
    if (c) { setSeen(c); save(rememberStatus(followed, unitCode, status)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isFollowing, unitCode]);

  // Made in the browser after load, so the server and first paint agree.
  const [href, setHref] = useState("#");
  useEffect(() => {
    const ics = buildIcs({ unitCode, unitName, date: VOTING_DATE, url: `${window.location.origin}/unit/${encodeURIComponent(unitCode)}` });
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    setHref(url);
    return () => URL.revokeObjectURL(url);
  }, [unitCode, unitName]);

  const lang = evidenceLang(l);
  return (
    <section className="card plan" aria-labelledby="plan-h">
      <div className="kicker">{t(l, "plan.title")}</div>
      <h2 className="serif" id="plan-h">{t(l, "plan.date")}: {new Date(VOTING_DATE + "T00:00:00Z").toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</h2>
      <p className="muted">{t(l, "plan.rules")}</p>
      <div className="actions">
        <a className="btn alt" href={href} download={`voting-day-${unitCode}.ics`}>{t(l, "plan.cal")}</a>
        <a className="btn alt" href={OFFICIAL_URL} target="_blank" rel="noreferrer">{t(l, "plan.official")} ↗</a>
        <button className="btn" aria-pressed={isFollowing} onClick={() => status && save(toggleFollow(followed, unitCode, status))} disabled={!status && !isFollowing}>
          {isFollowing ? `✓ ${t(l, "plan.following")}` : t(l, "plan.follow")}
        </button>
      </div>
      {isFollowing && (
        <p role="status" className="muted">
          {seen
            ? <>{t(l, "plan.changed")} <b>{statusCopy(seen.from, lang).label}</b> → <b>{statusCopy(seen.to, lang).label}</b></>
            : t(l, "plan.nochange")}
          {" "}{t(l, "plan.nonotify")}
        </p>
      )}
    </section>
  );
}
