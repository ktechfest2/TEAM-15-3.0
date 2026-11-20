/** The same facts, in the same order, for every candidate. These are exactly the fields INEC's list prints. */
export const FIELD_ORDER = ["party", "age", "qualifications", "running_mate"] as const;
export type FieldName = (typeof FIELD_ORDER)[number];

export interface Person { name: string; age: number; qualifications: string }
export interface Candidate {
  id: string; surname: string; given: string; party: string; partyName: string; age: number; qualifications: string;
  runningMate: Person; remark?: string;
}
export interface Source { name: string; url: string; checkedOn: string }
export interface NotNamed { party: string; partyName: string; remark: string }
export interface CandidateData { race: string; election: string; source: Source; partiesSource: Source; candidates: Candidate[]; notNamed: NotNamed[] }

/** Names are shown exactly as INEC prints them, surname first ("Tinubu Bola Ahmed"). We do not guess which word is a surname. */
export const displayName = (p: { given: string; surname: string }) => `${p.surname} ${p.given}`;

const isDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const str = (v: unknown, w: string) => { if (typeof v !== "string" || !v.trim()) throw new Error(`candidates: bad ${w}`); return v; };
const age = (v: unknown, w: string) => { if (typeof v !== "number" || !Number.isInteger(v) || v < 18 || v > 109) throw new Error(`candidates: bad ${w}`); return v; };

function source(v: unknown, w: string): Source {
  const o = v as { name?: unknown; url?: unknown; checkedOn?: unknown } | null;
  if (!o || typeof o.name !== "string" || typeof o.url !== "string" || !o.url.startsWith("https://") || !isDate(o.checkedOn)) throw new Error(`candidates: bad source ${w}`);
  return { name: o.name, url: o.url, checkedOn: o.checkedOn as string };
}

/** Read the file defensively. A missing field, an unknown party or a source that is not https stops the build. */
export function loadCandidates(raw: unknown): CandidateData {
  const o = raw as { race?: unknown; election?: unknown; source?: unknown; partiesSource?: unknown; parties?: Record<string, string>; candidates?: unknown; notNamed?: unknown };
  if (typeof o?.race !== "string" || !isDate(o.election) || !o.parties || !Array.isArray(o.candidates) || o.candidates.length === 0 || !Array.isArray(o.notNamed)) throw new Error("candidates: bad file");
  const parties = o.parties;
  const partyName = (code: unknown, w: string) => { if (typeof code !== "string" || !parties[code]) throw new Error(`candidates: unknown party in ${w}`); return parties[code]!; };
  const person = (p: unknown, w: string): Person => {
    const r = p as Record<string, unknown> | null;
    if (!r) throw new Error(`candidates: missing ${w}`);
    return { name: str(r.name, `${w}.name`), age: age(r.age, `${w}.age`), qualifications: str(r.qualifications, `${w}.qualifications`) };
  };
  const candidates = o.candidates.map((c: Record<string, unknown>): Candidate => {
    const id = str(c.id, "id");
    const cand: Candidate = { id, surname: str(c.surname, `${id}.surname`), given: str(c.given, `${id}.given`), age: age(c.age, `${id}.age`), qualifications: str(c.qualifications, `${id}.qualifications`), party: str(c.party, `${id}.party`), partyName: partyName(c.party, id), runningMate: person(c.runningMate, `${id}.runningMate`) };
    if (typeof c.remark === "string" && c.remark) cand.remark = c.remark;
    return cand;
  });
  if (new Set(candidates.map((c) => c.id)).size !== candidates.length) throw new Error("candidates: duplicate id");
  // Always A to Z by surname, so file order can never favour anyone.
  candidates.sort((a, b) => `${a.surname} ${a.given}`.localeCompare(`${b.surname} ${b.given}`));
  const notNamed = o.notNamed.map((n: Record<string, unknown>): NotNamed => ({ party: str(n.party, "notNamed.party"), partyName: partyName(n.party, "notNamed"), remark: str(n.remark, "notNamed.remark") }));
  return { race: o.race, election: o.election as string, source: source(o.source, "source"), partiesSource: source(o.partiesSource, "partiesSource"), candidates, notNamed };
}
