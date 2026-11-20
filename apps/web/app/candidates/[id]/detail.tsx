"use client";

import Link from "next/link";
import { useApp } from "../../providers";
import { useGuide } from "../../../lib/guide/use-guide";
import { displayName } from "../../../lib/candidates/data";
import { KINDS, LIMITS, imageFor, itemsFor, type Item } from "../../../lib/candidates/extras";
import { Portrait, PartyMark } from "../../../components/portrait";
import { VideoTile } from "../../../components/video-tile";
import { ItemMeta, fmtDate } from "../../../components/item-meta";
import { t } from "../../../lib/guide/ui";

function Empty({ l }: { l: Parameters<typeof t>[0] }) {
  return <div className="empty"><b>{t(l, "cd.none")}</b> <span className="muted">{t(l, "cd.none.note")}</span></div>;
}

export function CandidateDetail({ id }: { id: string }) {
  const { prefs } = useApp();
  const l = prefs.lang;
  const { candidates: DATA, extras } = useGuide();
  const idx = DATA.candidates.findIndex((c) => c.id === id);
  const c = DATA.candidates[idx]!;
  const prev = DATA.candidates[idx - 1] ?? null, next = DATA.candidates[idx + 1] ?? null;
  const items = itemsFor(extras, id);
  const photo = imageFor(extras.photos, id), logo = imageFor(extras.logos, c.party);
  const name = displayName(c);
  const link = (i: Item, label: "cd.read" | "cd.watch" | "cd.fulltext") => <a href={i.url} target="_blank" rel="noreferrer">{t(l, label)}</a>;
  return (
    <div className="front">
      <div className="front-main">
        <p className="back"><Link href="/candidates">{t(l, "cd.back")}</Link></p>
        <div className="profile">
          <Portrait name={name} photo={photo} size="lg" />
          <div>
            <div className="kicker"><PartyMark code={c.party} name={c.partyName} logo={logo} /> {DATA.race}</div>
            <h1>{name}</h1>
            <dl className="facts">
              <div><dt>{t(l, "cand.party")}</dt><dd>{c.partyName} ({c.party})</dd></div>
              <div><dt>{t(l, "cand.runmate")}</dt><dd>{c.runningMate.name}</dd></div>
              <div><dt>{t(l, "cand.age")}</dt><dd>{c.age}</dd></div>
              <div><dt>{t(l, "cand.quals")}</dt><dd>{c.qualifications}</dd></div>
            </dl>
          </div>
        </div>
        <nav className="anchors" aria-label={t(l, "cd.onpage")}>
          <a href="#speeches">{t(l, "cd.speeches")}</a><a href="#videos">{t(l, "cd.videos")}</a><a href="#pubs">{t(l, "cd.pubs")}</a>
        </nav>

        <section className="speeches" id="speeches" aria-labelledby="h-sp">
          <div className="kicker">{t(l, "cd.speeches.kicker")}</div>
          <h2 id="h-sp">{t(l, "cd.speeches")}</h2>
          <p className="dek">{t(l, "cd.speeches.dek")}</p>
          {items.speech.length === 0 ? <Empty l={l} /> : items.speech.map((i) => (
            <article className="speech" key={i.id}>
              <time dateTime={i.date}>{fmtDate(i.date, l)}</time>
              <div>
                <h3>{i.title}</h3>
                <ItemMeta item={i} lang={l} />
                {i.excerpt && <blockquote className="quote"><span className="muted small-print">{t(l, "cd.opening")}</span><br />“{i.excerpt}”</blockquote>}
                <p className="links">{link(i, "cd.fulltext")}<span className="muted small-print"> · {t(l, "cand.checked")} {i.checkedOn}</span></p>
              </div>
            </article>
          ))}
        </section>

        <section id="videos" aria-labelledby="h-vd">
          <h2 id="h-vd" className="h2">{t(l, "cd.videos")}</h2>
          <p className="dek">{t(l, "cd.videos.dek")}</p>
          {items.video.length === 0 ? <Empty l={l} /> : (
            <div className="vids">
              {items.video.map((i) => (
                <article className="vid" key={i.id}>
                  <VideoTile videoId={i.videoId!} title={i.title} />
                  <b>{i.title}</b>
                  <small>{i.publisher} · <time dateTime={i.date}>{fmtDate(i.date, l)}</time></small>
                  <ItemMeta item={i} lang={l} />
                  <p className="links">{link(i, "cd.watch")}<span className="muted small-print"> · {t(l, "cand.checked")} {i.checkedOn}</span></p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="pubs" aria-labelledby="h-pb">
          <h2 id="h-pb" className="h2">{t(l, "cd.pubs")}</h2>
          <p className="dek">{t(l, "cd.pubs.dek")}</p>
          {items.publication.length === 0 ? <Empty l={l} /> : (
            <div className="pubs">
              {items.publication.map((i) => (
                <article className="pub" key={i.id}>
                  <div>
                    <b>{i.title}</b>
                    <small>{i.publisher} · <time dateTime={i.date}>{fmtDate(i.date, l)}</time></small>
                    <ItemMeta item={i} lang={l} />
                    <span className="muted small-print">{t(l, "cand.checked")} {i.checkedOn}</span>
                  </div>
                  <span className="links">{link(i, "cd.read")}</span>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="card how"><h3>{t(l, "cd.how.title")}</h3><p>{t(l, "cd.how.body")}</p></div>
        <div className="pn">
          {prev ? <Link href={`/candidates/${prev.id}`}>{t(l, "cd.prev")}<br /><b>{displayName(prev)}</b></Link> : <span className="muted">{t(l, "cd.first")}</span>}
          {next ? <Link href={`/candidates/${next.id}`} className="r">{t(l, "cd.next")}<br /><b>{displayName(next)}</b></Link> : <span className="muted">{t(l, "cd.last")}</span>}
        </div>
      </div>

      <aside className="rail" aria-label={t(l, "cd.onpage")}>
        <div className="bar-label">{t(l, "cd.onpage")}</div>
        {KINDS.map((k) => (
          <div className="rrow" key={k}><time>{t(l, k === "speech" ? "cd.speeches" : k === "video" ? "cd.videos" : "cd.pubs")}</time><b>{t(l, "cd.shown").replace("{n}", String(items[k].length)).replace("{max}", String(LIMITS[k]))}</b></div>
        ))}
        <div className="bar-label" style={{ marginTop: 18 }}>INEC</div>
        <div className="rrow"><time>{DATA.source.checkedOn}</time><b><a href={DATA.source.url} target="_blank" rel="noreferrer">{t(l, "cand.source")} ↗</a></b></div>
        {(photo || logo) && <div className="bar-label" style={{ marginTop: 18 }}>{t(l, "cd.photo")} / {t(l, "cd.logo")}</div>}
        {photo && <div className="rrow"><time>{t(l, "cd.photo")}</time><b>{photo.author} · <a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a> · <a href={photo.pageUrl} target="_blank" rel="noreferrer">↗</a></b></div>}
        {logo && <div className="rrow"><time>{t(l, "cd.logo")}</time><b>{logo.author} · <a href={logo.licenseUrl} target="_blank" rel="noreferrer">{logo.license}</a> · <a href={logo.pageUrl} target="_blank" rel="noreferrer">↗</a></b></div>}
      </aside>
    </div>
  );
}
