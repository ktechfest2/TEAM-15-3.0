import type { CandidateData } from "./data";

/** The same limits for every candidate, so no page is longer or shorter because of who the candidate is. */
export const LIMITS = { speech: 3, video: 4, publication: 5 } as const;
export type ItemKind = keyof typeof LIMITS;
export const KINDS: ItemKind[] = ["speech", "video", "publication"];
/** Who put the item out. Shown on every item. */
export const PUBLISHER_TYPES = ["candidate", "party", "outlet", "official", "academic"] as const;
export type PublisherType = (typeof PUBLISHER_TYPES)[number];

export interface Item {
  id: string; candidateId: string; kind: ItemKind; title: string; url: string; publisher: string; publisherType: PublisherType;
  date: string; checkedOn: string; opinion: boolean;
  language?: string; occasion?: string; place?: string; length?: string; excerpt?: string; videoId?: string;
}
export interface Image { url: string; pageUrl: string; author: string; license: string; licenseUrl: string }
export interface Extras { items: Item[]; photos: Record<string, Image>; logos: Record<string, Image> }

const ITEM_KEYS = new Set(["id", "candidateId", "kind", "title", "url", "publisher", "publisherType", "date", "checkedOn", "opinion", "language", "occasion", "place", "length", "excerpt"]);
const IMAGE_KEYS = new Set(["url", "pageUrl", "author", "license", "licenseUrl"]);
const EXCERPT_MAX = 300;

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const https = (v: unknown, w: string): string => { if (typeof v !== "string" || !v.startsWith("https://")) throw new Error(`extras: ${w} must be an https link`); return v; };
const text = (v: unknown, w: string): string => { if (typeof v !== "string" || !v.trim()) throw new Error(`extras: bad ${w}`); return v; };

/** The 11-character id of a YouTube video, from the usual link shapes. Anything else is null. */
export function youtubeId(url: string): string | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  const host = u.hostname.replace(/^www\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1);
  else if (host === "youtube.com" || host === "m.youtube.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else if (u.pathname.startsWith("/embed/") || u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2] ?? null;
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

function image(raw: unknown, w: string): Image {
  const o = raw as Record<string, unknown> | null;
  if (!o || typeof o !== "object") throw new Error(`extras: bad image ${w}`);
  for (const k of Object.keys(o)) if (!IMAGE_KEYS.has(k)) throw new Error(`extras: unknown image field ${k}`);
  return { url: https(o.url, `${w}.url`), pageUrl: https(o.pageUrl, `${w}.pageUrl`), author: text(o.author, `${w}.author`), license: text(o.license, `${w}.license`), licenseUrl: https(o.licenseUrl, `${w}.licenseUrl`) };
}

/** Read the file defensively. Anything that is unsourced, unlabelled, over the limit or about someone not on INEC's list stops the build. */
export function loadExtras(raw: unknown, cands: CandidateData): Extras {
  const o = raw as { items?: unknown; photos?: Record<string, unknown>; logos?: Record<string, unknown> } | null;
  if (!o || !Array.isArray(o.items) || typeof o.photos !== "object" || typeof o.logos !== "object") throw new Error("extras: bad file");
  const ids = new Set(cands.candidates.map((c) => c.id));
  const parties = new Set(cands.candidates.map((c) => c.party));
  const seen = new Set<string>();
  const counts = new Map<string, number>();
  const items = o.items.map((r: Record<string, unknown>): Item => {
    for (const k of Object.keys(r)) if (!ITEM_KEYS.has(k)) throw new Error(`extras: unknown field ${k}`);
    const id = text(r.id, "id");
    if (seen.has(id)) throw new Error(`extras: duplicate id ${id}`);
    seen.add(id);
    const candidateId = text(r.candidateId, `${id}.candidateId`);
    if (!ids.has(candidateId)) throw new Error(`extras: ${id} is not about a candidate on INEC's list`);
    const kind = r.kind as ItemKind;
    if (!KINDS.includes(kind)) throw new Error(`extras: bad kind in ${id}`);
    const publisherType = r.publisherType as PublisherType;
    if (!PUBLISHER_TYPES.includes(publisherType)) throw new Error(`extras: bad publisherType in ${id}`);
    if (typeof r.opinion !== "boolean") throw new Error(`extras: ${id} must say whether it is opinion`);
    if (!isDate(r.date) || !isDate(r.checkedOn)) throw new Error(`extras: bad date in ${id}`);
    const url = https(r.url, `${id}.url`);
    const it: Item = { id, candidateId, kind, title: text(r.title, `${id}.title`), url, publisher: text(r.publisher, `${id}.publisher`), publisherType, date: r.date, checkedOn: r.checkedOn, opinion: r.opinion };
    for (const k of ["language", "occasion", "place", "length"] as const) if (r[k] !== undefined) it[k] = text(r[k], `${id}.${k}`);
    if (r.excerpt !== undefined) {
      if (kind !== "speech" || typeof r.excerpt !== "string" || !r.excerpt.trim() || r.excerpt.length > EXCERPT_MAX) throw new Error(`extras: bad excerpt in ${id}`);
      it.excerpt = r.excerpt;
    }
    if (kind === "video") {
      const v = youtubeId(url);
      if (!v) throw new Error(`extras: ${id} must be a YouTube link`);
      it.videoId = v;
    }
    const key = `${candidateId}:${kind}`;
    const n = (counts.get(key) ?? 0) + 1;
    counts.set(key, n);
    if (n > LIMITS[kind]) throw new Error(`extras: ${candidateId} is over the limit of ${LIMITS[kind]} ${kind}s`);
    return it;
  });
  const photos: Record<string, Image> = {};
  for (const [id, v] of Object.entries(o.photos ?? {})) { if (!ids.has(id)) throw new Error(`extras: photo for unknown candidate ${id}`); photos[id] = image(v, `photos.${id}`); }
  const logos: Record<string, Image> = {};
  for (const [code, v] of Object.entries(o.logos ?? {})) { if (!parties.has(code)) throw new Error(`extras: logo for unknown party ${code}`); logos[code] = image(v, `logos.${code}`); }
  return { items, photos, logos };
}

/** A candidate's items, newest first, in the three fixed groups. */
export function itemsFor(e: Extras, candidateId: string): Record<ItemKind, Item[]> {
  const out: Record<ItemKind, Item[]> = { speech: [], video: [], publication: [] };
  for (const i of e.items) if (i.candidateId === candidateId) out[i.kind].push(i);
  for (const k of KINDS) out[k].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  return out;
}

export const imageFor = (m: Record<string, Image>, key: string): Image | null => m[key] ?? null;
