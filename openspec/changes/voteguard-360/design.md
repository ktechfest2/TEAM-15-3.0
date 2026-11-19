# Design

Visual design (journeys, 8 screens, diagrams): `.lavish/design.html`. Build plan and lanes: `.lavish/plan.html`.

## Context

- Greenfield repo; about 12 hours and 3 to 4 people. Four parallel lanes meet at fixed integration points (see tasks.md).
- Hackathon rules: all work original and created during the event; credit all libraries, APIs and models; declare AI coding assistants; label synthetic data.
- Users: observers on patchy connections, voters with low literacy or low vision, journalists, reviewers.

## Goals / Non-Goals

**Goals:** a deployed end-to-end flow (capture, fingerprint, store, extract, validate, compare, review, public view, Listen); tamper-evident records; honest wording about what a hash proves; works offline for capture.

**Non-Goals:** official collation or declaring results; real INEC data; SMS/USSD/IVR; public submissions; barrier reports; native apps.

## Decisions

1. **One Next.js app on Vercel, Supabase for Auth, Storage and Postgres.** Route handlers replace a separate API app. Alternative (NestJS service) rejected: slower to stand up overnight.
2. **Shared pure package `packages/evidence`** (sha256, validateArithmetic, compareSubmissions, statusFor, chain functions, narrate) used by phone and server. Written test-first; no network or DB, so it can start immediately and run in any lane.
3. **Hash twice.** The phone hashes with Web Crypto at capture; the server re-reads the stored image and recomputes. A mismatch flags the submission and is recorded in the audit chain.
4. **Claude vision for extraction** with a strict JSON schema and per-field confidence, behind an adapter interface. Results for the three demo sheets are cached as fixtures so the live demo does not depend on the network; a toggle enables live extraction. API key is server-side only.
5. **Never edit in place.** Machine values, observer-confirmed values, reviews and audit events are separate append-only records. Audit events are inserted by a server function; UPDATE and DELETE are revoked and a trigger refuses them. Each event stores `prev_hash`.
6. **Status rules (no "fraud" or "winner" states):** Waiting for review, Needs human review, Two people agree, Disputed, Reviewed. "Two people agree" requires two distinct signed-in submitters; identical file hashes from two senders count as one submission.
7. **Roles via Supabase Auth and RLS:** public (read), observer (insert and read own, confirm own), reviewer (read all, insert reviews). Public views never expose submitter identity.
8. **Offline capture:** service worker plus IndexedDB queue; the fingerprint is stored with the queued item and shown as "waiting to upload" until synced.
9. **Access layer built on verified data.** `narrate()` reads only verified fields and the status, in plain wording, and is tested to never say "correct", "fraud" or "winner". Listen uses browser text-to-speech; where a language voice is poor, text is shown instead of faked audio.
10. **Synthetic data only**, stamped DEMO in the UI and sample sheets; a data-source adapter interface keeps room for real records later.

## Risks / Trade-offs

- OCR misreads handwriting: values are shown as machine-assisted with confidence; low confidence routes to review. Demo sheets are typed.
- Demo network failure: cached extractions, recorded fallback video.
- Time: cut order is near-duplicate detection, extra voices and Pidgin, collation polish, offline queue (keep on-device hash). The seven core features and all submission deliverables are never cut.
- Reads as an official tool: persistent "independent evidence layer, not INEC" label and neutral copy.
- Observer privacy: pseudonymous public view, RLS, minimal personal data.
- Translations need a native-speaker check.

## Open Questions

- Who supplies `ANTHROPIC_API_KEY`, and is a Supabase project already provisioned?
- Are translations (Pidgin) reviewed by a native speaker before 07:00?
