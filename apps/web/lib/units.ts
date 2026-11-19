import data from "./data/units.json";

export interface PollingUnit {
  id: string;
  code: string;
  name: string;
  ward: string;
  lga: string;
  state: string;
  source: "demo_synthetic";
}

/** Synthetic DEMO polling units. Swap this module's source for a Supabase query later. */
export const units: PollingUnit[] = data as PollingUnit[];

export interface UnitFilter {
  state?: string;
  lga?: string;
  ward?: string;
  query?: string;
}

const uniq = (xs: string[]) => [...new Set(xs)].sort();

/** Options for the cascading State, LGA, Ward selects. A level is empty until its parent is chosen. */
export function optionsFor(f: UnitFilter): { states: string[]; lgas: string[]; wards: string[] } {
  const states = uniq(units.map((u) => u.state));
  const lgas = f.state ? uniq(units.filter((u) => u.state === f.state).map((u) => u.lga)) : [];
  const wards = f.state && f.lga ? uniq(units.filter((u) => u.state === f.state && u.lga === f.lga).map((u) => u.ward)) : [];
  return { states, lgas, wards };
}

/** Filter by place and by a free-text query matching the unit code or name (case-insensitive). */
export function searchUnits(f: UnitFilter): PollingUnit[] {
  const q = f.query?.trim().toLowerCase();
  return units.filter(
    (u) =>
      (!f.state || u.state === f.state) &&
      (!f.lga || u.lga === f.lga) &&
      (!f.ward || u.ward === f.ward) &&
      (!q || u.code.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)),
  );
}
