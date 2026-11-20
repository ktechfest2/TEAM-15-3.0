"use client";

import { useEffect, useState } from "react";
import candidatesRaw from "../data/candidates.json";
import coverageRaw from "../data/coverage.json";
import extrasRaw from "../data/candidate-extras.json";
import { loadCandidates } from "../candidates/data";
import { loadCoverage } from "../coverage/data";
import { loadExtras } from "../candidates/extras";
import { getBrowserClient } from "../client/supabase";
import { resolveGuide, type Guide } from "./remote";

const CANDS = loadCandidates(candidatesRaw);
const BUNDLED: Guide = { candidates: CANDS, coverage: loadCoverage(coverageRaw), extras: loadExtras(extrasRaw, CANDS), source: "bundled" };
let cached: Guide | null = null;

/** The bundled copy renders first (and offline); the database copy replaces it once it loads and validates. */
export function useGuide(): Guide {
  const [guide, setGuide] = useState<Guide>(cached ?? BUNDLED);
  useEffect(() => {
    if (cached) return;
    let live = true;
    const db = getBrowserClient();
    void resolveGuide(async (table) => {
      const { data, error } = await db.from(table).select("*");
      if (error) throw error;
      return (data ?? []) as never;
    }, BUNDLED).then((g) => { cached = g; if (live) setGuide(g); });
    return () => { live = false; };
  }, []);
  return guide;
}
