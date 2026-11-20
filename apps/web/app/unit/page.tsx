"use client";

import Link from "next/link";
import { Explorer } from "../explorer";
import { useFollowed } from "../../components/my-unit";
import { units } from "../../lib/units";
import { t } from "../../lib/guide/ui";
import { useApp } from "../providers";

export default function MyUnitIndex() {
  const { prefs } = useApp();
  const l = prefs.lang;
  const [followed] = useFollowed();
  const codes = Object.keys(followed);
  return (
    <>
      <div className="kicker">{t(l, "plan.title")}</div>
      <h1>{t(l, "nav.unit")}</h1>
      <p className="sub">{t(l, "unit.index.sub")}</p>
      {codes.length > 0 && (
        <>
          <h2 className="h2">{t(l, "unit.index.followed")}</h2>
          {codes.map((c) => {
            const u = units.find((x) => x.code === c);
            return u ? <Link key={c} href={`/unit/${encodeURIComponent(c)}`} className="door"><b>{u.name}</b><div className="muted">{u.code} · {u.ward} · {u.lga}</div></Link> : null;
          })}
        </>
      )}
      <Explorer />
    </>
  );
}
