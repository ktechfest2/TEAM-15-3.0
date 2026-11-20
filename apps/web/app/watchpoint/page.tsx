"use client";

import { useApp } from "../providers";
import { t } from "../../lib/guide/ui";

const WATCHPOINT_URL = "https://watchpoint-lac.vercel.app/";

/** WatchPoint is a separate service. It opens inside our page so it feels part of the site, and says plainly that it is separate. */
export default function WatchPointPage() {
  const { prefs, online } = useApp();
  const l = prefs.lang;
  return (
    <>
      <div className="kicker">{t(l, "wp.kicker")}</div>
      <h1>{t(l, "wp.title")}</h1>
      <p className="notice">{t(l, "wp.note")}</p>
      <p><a className="btn alt" href={WATCHPOINT_URL} target="_blank" rel="noreferrer">{t(l, "wp.open")}</a></p>
      {online
        ? <iframe className="partner-frame" src={WATCHPOINT_URL} title={t(l, "wp.frame")} loading="lazy" allow="geolocation" referrerPolicy="no-referrer" />
        : <p className="muted" role="status">{t(l, "wp.offline")}</p>}
    </>
  );
}
