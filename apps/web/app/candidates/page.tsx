"use client";

import Link from "next/link";
import { useState } from "react";
import { useGuide } from "../../lib/guide/use-guide";
import { imageFor, type Extras } from "../../lib/candidates/extras";
import { coverageSummary } from "../../lib/coverage/rubric";
import { Portrait, PartyMark } from "../../components/portrait";
import { displayName, type Candidate, type CandidateData, type FieldName } from "../../lib/candidates/data";
import { compareCandidates } from "../../lib/candidates/compare";
import { t, type UiKey } from "../../lib/guide/ui";
import type { GuideLang } from "../../lib/guide/langs";
import { useApp } from "../providers";

const LABEL: Record<FieldName, UiKey> = { party: "cand.party", age: "cand.age", qualifications: "cand.quals", running_mate: "cand.runmate" };

function Card({ c, lang, source, extras }: { c: Candidate; lang: GuideLang; source: CandidateData["source"]; extras: Extras }) {
  return (
    <article className="card cand" id={c.id}>
      <div className="cand-head">
        <Portrait name={displayName(c)} photo={imageFor(extras.photos, c.id)} />
        <div>
          <h2 className="serif"><Link href={`/candidates/${c.id}`}>{displayName(c)}</Link></h2>
          <div className="sub"><PartyMark code={c.party} name={c.partyName} logo={imageFor(extras.logos, c.party)} /> {c.partyName} ({c.party})</div>
        </div>
      </div>
      <dl>
        <div className="fact"><dt>{t(lang, "cand.runmate")}</dt><dd>{c.runningMate.name}<div className="muted small-print">{c.runningMate.age} · {c.runningMate.qualifications}</div></dd></div>
        <div className="fact"><dt>{t(lang, "cand.age")}</dt><dd>{c.age}</dd></div>
        <div className="fact"><dt>{t(lang, "cand.quals")}</dt><dd>{c.qualifications}</dd></div>
        {c.remark && <div className="fact"><dt>{t(lang, "cand.remark")}</dt><dd>{c.remark}</dd></div>}
      </dl>
      <Link className="more" href={`/candidates/${c.id}`}><span>{t(lang, "cd.details")}</span><b>{t(lang, "cd.details.go")}</b></Link>
      <p className="source"><a href={source.url} target="_blank" rel="noreferrer">{t(lang, "cand.source")}: INEC ↗</a> · {t(lang, "cand.checked")} {source.checkedOn}</p>
    </article>
  );
}

export default function CandidatesPage() {
  const { prefs } = useApp();
  const l = prefs.lang;
  const guide = useGuide();
  const DATA = guide.candidates;
  const story = guide.coverage.stories[0]!;
  const sum = coverageSummary(story, guide.coverage.outlets);
  const [a, setA] = useState(DATA.candidates[0]!.id);
  const [b, setB] = useState(DATA.candidates[1]!.id);
  const ca = DATA.candidates.find((c) => c.id === a) ?? DATA.candidates[0]!, cb = DATA.candidates.find((c) => c.id === b) ?? DATA.candidates[1]!;
  const rows = compareCandidates(ca, cb, l);
  return (
    <div className="front">
    <div className="front-main">
      <div className="kicker">{DATA.race} · {DATA.election}</div>
      <h1>{t(l, "nav.candidates")}</h1>
      <p className="dek">{t(l, "cand.sub")}</p>
      <p className="notice">{t(l, "cand.listnote")} {t(l, "cand.nojudge")}</p>
      <p><strong>{t(l, "cand.count").replace("{n}", String(DATA.candidates.length))}</strong></p>

      <div className="cands">{DATA.candidates.map((c) => <Card key={c.id} c={c} lang={l} source={DATA.source} extras={guide.extras} />)}</div>

      {DATA.notNamed.length > 0 && (
        <>
          <div className="bar-label">{t(l, "cand.notnamed")}</div>
          {DATA.notNamed.map((n) => <p key={n.party} className="muted">{n.partyName} ({n.party}) · {t(l, "cand.remark")}: {n.remark}</p>)}
        </>
      )}
      <p className="muted small-print">{t(l, "cand.pending")}</p>

      <h2 className="h2" id="compare">{t(l, "cand.compare")}</h2>
      <div className="row">
        <label className="field"><span>A</span>
          <select value={a} onChange={(e) => setA(e.target.value)}>{DATA.candidates.map((c) => <option key={c.id} value={c.id}>{displayName(c)}</option>)}</select></label>
        <label className="field"><span>B</span>
          <select value={b} onChange={(e) => setB(e.target.value)}>{DATA.candidates.map((c) => <option key={c.id} value={c.id}>{displayName(c)}</option>)}</select></label>
      </div>
      <div className="scroll"><table className="figures">
        <thead><tr><th scope="col" /><th scope="col">{displayName(ca)}</th><th scope="col">{displayName(cb)}</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.field}>
              <th scope="row">{t(l, LABEL[r.field])}</th>
              <td>{r.a}</td><td>{r.b}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <p className="muted small-print">{t(l, "cand.nojudge")}</p>
    </div>

    <aside className="rail" aria-label={t(l, "updated")}>
      <div className="bar-label">{t(l, "nav.coverage")}</div>
      <div className="rrow"><time>{story.articles[0]?.publishedOn ?? ""}</time><b><Link href="/coverage">{t(l, "home.cov.title")}</Link><br /><span className="muted">{t(l, "cov.covered").replace("{n}", String(sum.covered)).replace("{total}", String(sum.total))}</span></b></div>
      <div className="bar-label" style={{ marginTop: 18 }}>{t(l, "nav.prices")}</div>
      <div className="rrow"><time>NBS</time><b><Link href="/prices">{t(l, "home.lead.title")}</Link></b></div>
      <div className="bar-label" style={{ marginTop: 18 }}>{t(l, "nav.unit")}</div>
      <div className="rrow"><time>16 Jan</time><b><Link href="/unit">{t(l, "home.unit.title")}</Link></b></div>
      <div className="bar-label" style={{ marginTop: 18 }}>{t(l, "home.rail.title")}</div>
      <div className="rrow"><time>1</time><b>{t(l, "home.rail.r1")}</b></div>
      <div className="rrow"><time>2</time><b>{t(l, "home.rail.r2")}</b></div>
      <div className="rrow"><time>INEC</time><b><a href={DATA.source.url} target="_blank" rel="noreferrer">{t(l, "cand.source")} ↗</a> · {DATA.source.checkedOn}</b></div>
    </aside>
    </div>
  );
}
