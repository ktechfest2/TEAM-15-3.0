# Credits

Libraries, APIs, datasets and models used. Updated whenever a dependency is added.

| Item | Use | License / terms |
|---|---|---|
| TypeScript | Language | Apache-2.0 |
| Vitest | Test runner | MIT |
| Web Crypto API | SHA-256 in browser and Node | Web standard |
| OpenSpec | Spec-driven planning (`openspec/`) | MIT |
| Claude (Anthropic API) | Vision extraction of result-sheet figures (designed in, stubbed in this build) | Anthropic API terms |
| Claude Code | AI coding assistant (declared) | Anthropic terms |

| Next.js, React | Web app and API routes | MIT |
| Supabase (`@supabase/supabase-js`, Postgres, Storage, Auth) | Database, write-once storage, sign-in | Apache-2.0 / Supabase terms |
| Vercel | Hosting | Vercel terms |
| fake-indexeddb | Test double for the offline queue | Apache-2.0 |
| Pillow (Python) | Generates the synthetic sample sheets | HPND |
| Web Speech API | "Listen" in the browser | Web standard |

**Datasets**
- Polling units, result sheets and results figures: synthetic demo data generated for this project. No election has been held yet, so there are no real results.
- Candidate photos, party logos, speeches, videos and publications: none are included yet. Any added later carry their own source, author and licence on the page and in `guide_images` / `guide_candidate_items`.
- Candidates: INEC's published *Final list of candidates, Presidential* (inecnigeria.org) and INEC's register of political parties, read on 2026-11-20. Names are shown as INEC prints them.
- Election date: INEC's election calendar (inecnigeria.org/elections/calendar): Saturday 16 January 2027, presidential and National Assembly.
- Prices: National Bureau of Statistics, Selected Food Price Watch and PMS Price Watch (microdata.nigerianstat.gov.ng), May 2026 reports.
- Coverage: links to articles published by The Guardian (Nigeria), Premium Times, ThisDay, Vanguard, Nairametrics, Arise News and P.M. News. We store only the headline, date and link, and we do not copy article text. Ownership claims link to their source; where we could not confirm, the page says so.
