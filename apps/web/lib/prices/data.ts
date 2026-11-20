export interface PriceMonth { period: string; naira: number }
export interface PriceItem {
  id: string;
  kind: "food" | "fuel";
  unit: "kg" | "litre";
  now: PriceMonth | null;
  then: PriceMonth | null;
  missingReason?: string;
  publishedYoyPercent?: number | null;
  source: { name: string; url: string; checkedAgainstOriginal: boolean; note?: string };
}
export interface PriceData { retrievedOn: string; items: PriceItem[] }

const isPeriod = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}$/.test(v);

function month(v: unknown, where: string): PriceMonth | null {
  if (v === null || v === undefined) return null;
  const o = v as { period?: unknown; naira?: unknown };
  if (!isPeriod(o.period) || typeof o.naira !== "number" || !(o.naira > 0)) throw new Error(`prices: bad month in ${where}`);
  return { period: o.period, naira: o.naira };
}

/** Read the price file defensively: anything malformed stops the build rather than reaching a reader. */
export function loadPrices(raw: unknown): PriceData {
  const o = raw as { retrievedOn?: unknown; items?: unknown };
  if (typeof o?.retrievedOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(o.retrievedOn) || !Array.isArray(o.items)) throw new Error("prices: bad file");
  const items = o.items.map((r: Record<string, unknown>): PriceItem => {
    const id = r.id;
    if (typeof id !== "string" || (r.kind !== "food" && r.kind !== "fuel") || (r.unit !== "kg" && r.unit !== "litre")) throw new Error(`prices: bad item ${String(id)}`);
    const now = month(r.now, id), then = month(r.then, id);
    const s = r.source as { name?: unknown; url?: unknown; checkedAgainstOriginal?: unknown; note?: unknown } | undefined;
    if (!s || typeof s.name !== "string" || typeof s.url !== "string" || typeof s.checkedAgainstOriginal !== "boolean") throw new Error(`prices: bad source for ${id}`);
    return {
      id, kind: r.kind, unit: r.unit, now, then,
      missingReason: typeof r.missingReason === "string" ? r.missingReason : undefined,
      publishedYoyPercent: typeof r.publishedYoyPercent === "number" ? r.publishedYoyPercent : null,
      source: { name: s.name, url: s.url, checkedAgainstOriginal: s.checkedAgainstOriginal, note: typeof s.note === "string" ? s.note : undefined },
    };
  });
  return { retrievedOn: o.retrievedOn, items };
}
