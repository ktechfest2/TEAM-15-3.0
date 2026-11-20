import type { UiKey } from "./ui";

export type SectionId = "prices" | "candidates" | "coverage" | "unit" | "results" | "settings";

export interface Section { id: SectionId; href: string; labelKey: UiKey }

export const SECTIONS: Section[] = [
  { id: "candidates", href: "/candidates", labelKey: "nav.candidates" },
  { id: "coverage", href: "/coverage", labelKey: "nav.coverage" },
  { id: "prices", href: "/prices", labelKey: "nav.prices" },
  { id: "unit", href: "/unit", labelKey: "nav.unit" },
  { id: "results", href: "/dashboard", labelKey: "nav.results" },
  { id: "settings", href: "/settings", labelKey: "nav.settings" },
];

/** The bar under the masthead and the bottom bar on phones: candidates first, then coverage. There is no separate home page: the site opens on Candidates, and the logo goes there. Settings sit in the masthead. */
export const NAV: SectionId[] = ["candidates", "coverage", "prices", "unit", "results"];
export const TABS: SectionId[] = NAV;

const PREFIXES: [string, SectionId][] = [
  ["/prices", "prices"],
  ["/candidates", "candidates"],
  ["/coverage", "coverage"],
  ["/unit", "unit"],
  ["/capture", "unit"],
  ["/dashboard", "results"],
  ["/submission", "results"],
  ["/review", "results"],
  ["/settings", "settings"],
  ["/signin", "settings"],
];

export function activeSection(path: string): SectionId {
  const hit = PREFIXES.find(([p]) => path === p || path.startsWith(p + "/"));
  return hit ? hit[1] : "candidates"; // "/" is the candidates page too
}
