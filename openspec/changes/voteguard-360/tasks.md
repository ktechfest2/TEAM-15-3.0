# Tasks

Lanes: **A** platform and data, **B** integrity engine, **C** frontend, **D** extraction, content and demo. Rule for lane B and any logic task: write the failing test first, then the implementation. Clock times are for 2026-11-19 to 2026-11-20; deadline 09:00, submit code by 08:15.

## 1. Foundations (20:20–21:30, all lanes)

- [x] 1.1 [A] Create monorepo skeleton: `apps/web`, `packages/evidence`, `packages/shared`, `database/`, `docs/`, `public/sample-result-sheets/`
- [x] 1.2 [A] Create Supabase project, Vercel project, `.env.example` (no secrets), deploy a hello page
- [x] 1.3 [B] Define shared TypeScript types in `packages/shared`: submission, extraction, verification result, status, audit event. Merge before others code against them
- [x] 1.4 [A] Add README with Claude Code declaration, `CREDITS.md`, LICENSE, DEMO DATA statement
- [x] 1.5 [D] Generate three synthetic result sheets stamped DEMO: clean, one altered figure, bad arithmetic
- [x] 1.6 Gate: live Vercel URL, shared types merged, Supabase reachable

## 2. Integrity engine, tests first (B, 21:30–00:30)

- [x] 2.1 Failing tests then `sha256`: known vectors, one flipped byte, browser and server agree
- [x] 2.2 Failing tests then `validateArithmetic`: all five rules plus negatives, blanks, missing
- [x] 2.3 Failing tests then `compareSubmissions`: agree, one field differs, same file hash is not independent
- [x] 2.4 Failing tests then `statusFor`: every transition in the status machine and nothing else
- [x] 2.5 Failing tests then `chainAuditEvent` and `verifyChain`: prev-hash link, tamper detection
- [x] 2.6 Failing tests then `narrate` (English, then Pidgin): verified fields only, no "correct", "fraud" or "winner", numbers spoken in full

## 3. Platform and data (A, 21:30–00:30 then 01:15–04:00)

- [x] 3.1 Schema (database/schema.sql, applied to Supabase project voteguard-360 and verified: 7 tables, RLS on all 7): polling_units, profiles, submissions, extractions, verification_results, reviews, audit_events
- [x] 3.2 RLS policies per role; RLS tests in database/tests/pieces (public cannot read submitter ids; observer cannot create reviews; reviewer can) pass on the live project
- [x] 3.3 Audit trigger refusing UPDATE, DELETE and TRUNCATE; revoked privileges; server function appends chained events (tests 4 and 5 pass on the live project)
- [x] 3.4 Write-once storage bucket and signed upload URL flow (verified live: second write to the same path is refused; paths hold no user id)
- [x] 3.5 (144 synthetic units and 3 demo users, 2 observers and 1 reviewer, are in Supabase; credentials in gitignored .demo-users.local; synthetic published ward figure in apps/web/lib/data/published-wards.json) Seed script: synthetic polling units (a few states, a few hundred units), a synthetic published ward figure, demo users per role
- [x] 3.6 Route handlers: `/api/uploads`, `/api/submissions/:id/extract`, `/confirm`, `/api/units`, `/api/units/:id/evidence`, `/narration`, `/api/reviews` (95 tests; deployed; authenticated round trip checked on production)
- [x] 3.7 Server hash re-check wired into extract, mismatch flagged and audited

## 4. Extraction, content and demo (D)

- [x] 4.1 Extraction adapter returning typed JSON with per-field confidence; **Anthropic call is stubbed for now** (no network, no key); real call to be added later, key server-side only
- [x] 4.2 Cache extraction output for the three demo sheets as fixtures; add live/cached toggle
- [x] 4.3 Contract test for the adapter using fixtures
- [ ] 4.4 (English + Pidgin status text done in apps/web/lib/status-copy.ts; native-speaker check pending) Easy-read status sentences in English and Pidgin; native-speaker check
- [x] 4.5 Drafts: `docs/problem-brief.md` (one page), system sketch SVG/PNG, `docs/writeup.md` (problem, solution, AI usage, tools), `docs/architecture.md`
- [x] 4.6 Demo script and sample scenario (planted altered figure)

## 5. Frontend (C, 21:30–04:00)

- [x] 5.1 Mobile-first shell with persistent DEMO DATA and not-INEC banner
- [x] 5.2 Polling unit explorer (state, LGA, ward, code or name search)
- [x] 5.3 Capture screen with unit confirmation, on-device SHA-256, fingerprint time and offline IndexedDB queue (background upload and receipts wired)
- [x] 5.4 Extraction review screen: values, confidence flags, arithmetic checks, confirm or fix
- [x] 5.5 Evidence record screen: image, status, fingerprint with honest tooltip, audit timeline
- [x] 5.6 Comparison screen with differing field highlighted and neutral wording
- [x] 5.7 Public dashboard and collation roll-up
- [x] 5.8 Reviewer console: queue, side-by-side photos, decisions, public note

## 6. Integration 1: walking skeleton (00:30–01:15, all)

- [x] 6.1 Wire upload, hash, store, extract, validate, evidence page end to end
- [ ] 6.2 Gate: a sheet uploaded from a phone shows extracted fields and an arithmetic result (all API steps verified on production; the signed-in phone flow still needs a person to run it on a real phone)

## 7. Compare, review, audit wiring (01:15–04:00)

- [x] 7.1 [A/B] Second-submission comparison and status updates persisted
- [x] 7.2 [A/B] Review decisions recorded with audit events
- [x] 7.3 [A] Audit event appended for every step; chain verification page or check
- [x] 7.4 Gate: planted discrepancy flows Disputed, human review, public dashboard

## 8. Offline and access layer (05:30–07:00)

- [x] 8.1 [C] PWA manifest, service worker, IndexedDB queue, "waiting to upload" state, receipt on sync
- [x] 8.2 [C] A2 accessibility mode: large text, high contrast, reduced motion, slow voice, screen-reader labels, keyboard use, persistence
- [x] 8.3 [C] A1 Listen using text-to-speech and the narration endpoint; text fallback when no voice
- [x] 8.4 [C/D] A3 easy-read status sentences and icons wired into every status display
- [ ] 8.5 [D] 2 to 3 quick user tests; keep one quote each for the write-up
- [ ] 8.6 Gate: full demo works on a phone in airplane mode then reconnect (not yet run on a real phone)

## 9. Freeze and submit (07:00–09:00)

- [ ] 9.1 07:00 feature freeze; bug fixes only
- [ ] 9.2 Finalise brief, sketch, write-up, README (setup, limitations, synthetic-data statement), `CREDITS.md`, Claude Code declaration
- [ ] 9.3 Rehearse the 3-minute demo twice on phone and laptop
- [ ] 9.4 Record demo video, under 3:00
- [ ] 9.5 Tag repo, make it public; submit GitHub code (phase 1)
- [ ] 9.6 By 08:15 submit the form with the live demo link; check it on mobile data
- [ ] 9.7 Remaining time is buffer; no new features

## Cut order if behind

1. Near-duplicate image detection (already stretch)
2. Pidgin strings and extra voices (keep A2, plain-English text, English audio)
3. Collation roll-up polish (keep a minimal table)
4. Offline queue (keep the on-device hash)

Never cut: the core capture, verify, compare, dashboard and audit features and every submission deliverable.
