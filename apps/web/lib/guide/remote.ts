import { loadCandidates, type CandidateData } from "../candidates/data";
import { loadCoverage, type CoverageData } from "../coverage/data";
import { loadExtras, type Extras } from "../candidates/extras";
import { OPTIONAL_TABLES, TABLES, rowsToGuide, type GuideRows, type TableName } from "./rows";

export interface Guide { candidates: CandidateData; coverage: CoverageData; extras: Extras; source: "database" | "bundled" }
type FetchTable = (table: TableName) => Promise<GuideRows[TableName]>;

/**
 * Read the guide from the database. Anything that goes wrong (offline, slow, empty, or data that fails
 * the same checks as the bundled files) means we show the bundled copy instead, so the page never breaks.
 */
export async function resolveGuide(fetchTable: FetchTable, bundled: Omit<Guide, "source">, timeoutMs = 4000): Promise<Guide> {
  try {
    const work = (async () => {
      // The candidate-page tables are newer: if they are missing, the rest of the guide still comes from the database.
      const entries = await Promise.all(TABLES.map(async (t) => {
        try { return [t, await fetchTable(t)] as const; } catch (e) { if (OPTIONAL_TABLES.includes(t)) return [t, []] as const; throw e; }
      }));
      const rows = Object.fromEntries(entries) as GuideRows;
      if (rows.guide_candidates.length === 0 || rows.guide_races.length === 0 || rows.guide_outlets.length === 0) throw new Error("empty");
      const raw = rowsToGuide(rows);
      const candidates = loadCandidates(raw.candidates);
      let extras = bundled.extras;
      if (rows.guide_candidate_items.length > 0 || rows.guide_images.length > 0) {
        try { extras = loadExtras(raw.extras, candidates); } catch { /* keep the bundled items */ }
      }
      return { candidates, coverage: loadCoverage(raw.coverage), extras, source: "database" as const };
    })();
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("slow")), timeoutMs));
    return await Promise.race([work, timeout]);
  } catch {
    return { ...bundled, source: "bundled" };
  }
}
