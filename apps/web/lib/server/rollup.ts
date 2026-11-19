import type { ResultFields, Status } from "@voteguard/shared";
import published from "../data/published-wards.json";
import { loadUnit } from "./evidence";
import type { Deps } from "./ports";

export interface PublishedFigures {
  source: string;
  registered: number; accredited: number; valid: number; rejected: number; cast: number;
  parties: Record<string, number>;
}

export interface WardRollup {
  state: string; lga: string; ward: string;
  units_total: number;
  counts: Record<Status, number>;
  /** Units where two independent people agree. Only these are summed. */
  counted_units: number;
  counted: ResultFields | null;
  published: PublishedFigures | null;
  /** True only when every unit in the ward is counted, so the two totals can be set side by side. */
  comparable: boolean;
}

const emptyCounts = (): Record<Status, number> => ({
  waiting_for_review: 0, needs_human_review: 0, two_people_agree: 0, disputed: 0, reviewed: 0,
});

export function sumFields(list: ResultFields[]): ResultFields {
  const out: ResultFields = { registered: 0, accredited: 0, parties: {}, valid: 0, rejected: 0, cast: 0 };
  for (const f of list) {
    for (const k of ["registered", "accredited", "valid", "rejected", "cast"] as const) out[k] = (out[k] ?? 0) + (f[k] ?? 0);
    for (const [p, v] of Object.entries(f.parties)) out.parties[p] = (out.parties[p] ?? 0) + (v ?? 0);
  }
  return out;
}

/** Counts by status per ward, plus a running sum of agreed units beside the synthetic published figure. */
export async function dashboard(deps: Deps) {
  const units = await deps.db.listUnits();
  const statuses = await deps.db.unitStatuses();
  const totals = emptyCounts();
  const wards = new Map<string, WardRollup>();
  const agreed = new Map<string, ResultFields[]>();

  for (const u of units) {
    const status: Status = statuses[u.id] ?? "waiting_for_review";
    totals[status]++;
    const key = `${u.state}|${u.lga}|${u.ward}`;
    let w = wards.get(key);
    if (!w) {
      w = {
        state: u.state, lga: u.lga, ward: u.ward, units_total: 0, counts: emptyCounts(),
        counted_units: 0, counted: null, published: (published as Record<string, PublishedFigures>)[key] ?? null, comparable: false,
      };
      wards.set(key, w);
    }
    w.units_total++;
    w.counts[status]++;
    if (status === "two_people_agree") {
      const loaded = await loadUnit(deps, u.id);
      const fields = loaded.submissions[0]?.fields;
      if (fields) agreed.set(key, [...(agreed.get(key) ?? []), fields]);
    }
  }
  for (const [key, w] of wards) {
    const list = agreed.get(key) ?? [];
    w.counted_units = list.length;
    w.counted = list.length ? sumFields(list) : null;
    w.comparable = w.units_total > 0 && w.counted_units === w.units_total;
  }
  const active = [...wards.values()].filter((w) => w.published || w.units_total - w.counts.waiting_for_review > 0);
  active.sort((a, b) => `${a.state}${a.lga}${a.ward}`.localeCompare(`${b.state}${b.lga}${b.ward}`));
  return { units_total: units.length, totals, wards: active };
}
