/**
 * The voter guide's candidates and coverage as database rows, and back again.
 * One file with no runtime imports, so a plain `node` script can use it to write the seed SQL.
 * The round trip is tested: rows give back exactly the JSON the app already validates.
 */
type Row = Record<string, string | number | boolean | null>;
export const TABLES = ["guide_races", "guide_parties", "guide_candidates", "guide_not_named", "guide_outlets", "guide_stories", "guide_articles", "guide_article_checks", "guide_candidate_items", "guide_images"] as const;
/** The two tables added for candidate pages. If they are missing or fail the checks, the bundled copy of just these is used. */
export const OPTIONAL_TABLES: readonly TableName[] = ["guide_candidate_items", "guide_images"];
export type TableName = (typeof TABLES)[number];
export type GuideRows = Record<TableName, Row[]>;

const PK: Record<TableName, string[]> = {
  guide_races: ["id"], guide_parties: ["code"], guide_candidates: ["id"], guide_not_named: ["race_id", "party"],
  guide_outlets: ["id"], guide_stories: ["id"], guide_articles: ["id"], guide_article_checks: ["article_id", "check_name", "reviewer"], guide_candidate_items: ["id"], guide_images: ["id"],
};
const RACE_ID = "president-2027";
const CHECK_NAMES = ["names_sources", "marks_fact_opinion", "corrections_page"] as const;

/* eslint-disable @typescript-eslint/no-explicit-any */
export function guideToRows(candRaw: any, covRaw: any, extrasRaw: any = { items: [], photos: {}, logos: {} }): GuideRows {
  const rows = Object.fromEntries(TABLES.map((t) => [t, [] as Row[]])) as GuideRows;
  rows.guide_races.push({
    id: RACE_ID, name: candRaw.race, election_date: candRaw.election,
    source_name: candRaw.source.name, source_url: candRaw.source.url, source_checked_on: candRaw.source.checkedOn,
    parties_source_name: candRaw.partiesSource.name, parties_source_url: candRaw.partiesSource.url, parties_source_checked_on: candRaw.partiesSource.checkedOn,
  });
  for (const [code, name] of Object.entries(candRaw.parties as Record<string, string>)) rows.guide_parties.push({ code, name });
  for (const c of candRaw.candidates) rows.guide_candidates.push({
    id: c.id, race_id: RACE_ID, surname: c.surname, given: c.given, party: c.party, age: c.age, qualifications: c.qualifications,
    running_mate_name: c.runningMate.name, running_mate_age: c.runningMate.age, running_mate_qualifications: c.runningMate.qualifications, remark: c.remark ?? null,
  });
  for (const n of candRaw.notNamed) rows.guide_not_named.push({ race_id: RACE_ID, party: n.party, remark: n.remark });
  covRaw.outlets.forEach((o: any, i: number) => rows.guide_outlets.push({
    id: o.id, position: i, name: o.name, ownership: o.ownership, ownership_source: o.ownershipSource, region: o.region, language: o.language, tracked: o.tracked,
  }));
  covRaw.stories.forEach((s: any, si: number) => {
    rows.guide_stories.push({ id: s.id, position: si, title: s.title, summary: s.summary, official_name: s.official.name, official_url: s.official.url });
    s.articles.forEach((a: any, ai: number) => {
      const id = `${s.id}:${a.outletId}`;
      rows.guide_articles.push({ id, story_id: s.id, outlet_id: a.outletId, position: ai, headline: a.headline, published_on: a.publishedOn, type: a.type, url: a.url });
      for (const k of CHECK_NAMES) (a.checks[k] as any[]).forEach((r, seq) => rows.guide_article_checks.push({ article_id: id, check_name: k, reviewer: r.reviewer, answer: r.answer, answered_on: r.on, seq }));
    });
  });
  for (const i of extrasRaw.items) rows.guide_candidate_items.push({
    id: i.id, candidate_id: i.candidateId, kind: i.kind, title: i.title, url: i.url, publisher: i.publisher, publisher_type: i.publisherType,
    published_on: i.date, checked_on: i.checkedOn, opinion: i.opinion, language: i.language ?? null, occasion: i.occasion ?? null, place: i.place ?? null, length: i.length ?? null, excerpt: i.excerpt ?? null,
  });
  for (const [kind, map] of [["photo", extrasRaw.photos], ["logo", extrasRaw.logos]] as const) for (const [key, m] of Object.entries(map as Record<string, any>))
    rows.guide_images.push({ id: `${kind}:${key}`, kind, key, url: m.url, page_url: m.pageUrl, author: m.author, license: m.license, license_url: m.licenseUrl });
  return rows;
}

export function rowsToGuide(rows: GuideRows): { candidates: any; coverage: any; extras: any } {
  const race = rows.guide_races[0]!;
  const candidates = {
    race: race.name, election: race.election_date,
    source: { name: race.source_name, url: race.source_url, checkedOn: race.source_checked_on },
    partiesSource: { name: race.parties_source_name, url: race.parties_source_url, checkedOn: race.parties_source_checked_on },
    parties: Object.fromEntries(rows.guide_parties.map((p) => [p.code, p.name])),
    candidates: rows.guide_candidates.map((c) => {
      const o: any = { id: c.id, surname: c.surname, given: c.given, party: c.party, age: c.age, qualifications: c.qualifications,
        runningMate: { name: c.running_mate_name, age: c.running_mate_age, qualifications: c.running_mate_qualifications } };
      if (c.remark) o.remark = c.remark;
      return o;
    }),
    notNamed: rows.guide_not_named.map((n) => ({ party: n.party, remark: n.remark })),
  };
  const byPos = (a: Row, b: Row) => Number(a.position) - Number(b.position);
  const coverage = {
    outlets: [...rows.guide_outlets].sort(byPos).map((o) => ({ id: o.id, name: o.name, ownership: o.ownership, ownershipSource: o.ownership_source, region: o.region, language: o.language, tracked: o.tracked })),
    stories: [...rows.guide_stories].sort(byPos).map((s) => ({
      id: s.id, title: s.title, summary: s.summary, official: { name: s.official_name, url: s.official_url },
      articles: rows.guide_articles.filter((a) => a.story_id === s.id).sort(byPos).map((a) => {
        const checks: Record<string, any[]> = Object.fromEntries(CHECK_NAMES.map((k) => [k, []]));
        rows.guide_article_checks.filter((c) => c.article_id === a.id).sort((x, y) => Number(x.seq) - Number(y.seq))
          .forEach((c) => checks[c.check_name as string]!.push({ reviewer: c.reviewer, answer: c.answer, on: c.answered_on }));
        return { outletId: a.outlet_id, headline: a.headline, publishedOn: a.published_on, type: a.type, url: a.url, checks };
      }),
    })),
  };
  const extras: any = { items: [], photos: {}, logos: {} };
  for (const i of [...rows.guide_candidate_items].sort((a, b) => String(a.id).localeCompare(String(b.id)))) {
    const o: any = { id: i.id, candidateId: i.candidate_id, kind: i.kind, title: i.title, url: i.url, publisher: i.publisher, publisherType: i.publisher_type, date: i.published_on, checkedOn: i.checked_on, opinion: i.opinion };
    for (const [col, k] of [["language", "language"], ["occasion", "occasion"], ["place", "place"], ["length", "length"], ["excerpt", "excerpt"]] as const) if (i[col] !== null && i[col] !== undefined) o[k] = i[col];
    extras.items.push(o);
  }
  for (const m of rows.guide_images) extras[m.kind === "photo" ? "photos" : "logos"][m.key as string] = { url: m.url, pageUrl: m.page_url, author: m.author, license: m.license, licenseUrl: m.license_url };
  return { candidates, coverage, extras };
}

const lit = (v: string | number | boolean | null): string => (v === null ? "null" : typeof v === "string" ? `'${v.replace(/'/g, "''")}'` : String(v));

/** One transaction of idempotent upserts. It never deletes, drops or alters anything. */
export function buildSeedSql(rows: GuideRows): string {
  const out = ["begin;"];
  for (const t of TABLES) {
    const list = rows[t];
    if (list.length === 0) continue;
    const cols = Object.keys(list[0]!);
    const sets = cols.filter((c) => !PK[t].includes(c)).map((c) => `${c} = excluded.${c}`);
    out.push(`insert into public.${t} (${cols.join(", ")}) values\n${list.map((r) => `  (${cols.map((c) => lit(r[c] ?? null)).join(", ")})`).join(",\n")}\non conflict (${PK[t].join(", ")}) do update set ${sets.join(", ")};`);
  }
  out.push("commit;");
  return out.join("\n") + "\n";
}
