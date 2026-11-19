# Architecture

Live: https://voteguard-360.vercel.app · Sketch: [system-sketch.svg](system-sketch.svg)

```
 Phone (PWA, works offline)                Vercel: Next.js                    Supabase
 ───────────────────────────               ─────────────────────────         ────────────────────────────
 choose unit + photo
 SHA-256 on device (Web Crypto)
 save photo + fingerprint in IndexedDB
        │  when online and signed in
        ▼
 POST /api/uploads  ───────────────────►  check input, create submission ──►  Postgres (RLS on)
                    ◄───────────────────  signed upload URL (no user id in path)
 PUT file to signed URL ───────────────────────────────────────────────────►  Storage: write-once bucket
 POST /api/submissions/:id/extract ─────►  download stored bytes
                                           re-hash, compare with phone's hash
                                           read figures (adapter: cached or live)
                                           validate arithmetic, derive status
                                           append audit events ─────────────►  append_audit_event()
                                                                               refuses a bad chain link
 observer confirms or fixes figures ────►  /confirm (kept beside machine read)
 reviewer decides ──────────────────────►  /reviews
 public pages ◄─── /api/units, /evidence, /narration, /dashboard, /audit
```

## Decisions that matter

- **Hash twice.** The phone hashes at capture; the server re-reads the stored file and recomputes. A mismatch flags the photo and is written to the audit chain.
- **Never edit in place.** The machine reading, the observer's confirmed values, reviews and audit events are separate append-only records. UPDATE, DELETE and TRUNCATE on audit events are refused by a trigger.
- **The database enforces the chain.** Each audit event stores the previous event's hash. `append_audit_event` takes a lock and refuses an event whose `prev_hash` is not the current end of the chain. Anyone can recompute the chain from `/api/audit`.
- **Independent means different person and different file.** Two senders submitting the same file count as one photo.
- **Status rules only, no verdicts.** Five statuses, derived from stored records by pure functions that are tested for every transition. The narration function is tested never to say "correct", "fraud" or "winner".
- **Privacy by construction.** Public views never include submitter or reviewer identity. Storage paths contain no user id (the bucket is public). Observers see only their own submissions. RLS is on for every table and every grant is explicit.
- **Ports and adapters.** Server logic sits behind three small interfaces (database, storage, auth) so it is tested without a network. The extraction adapter serves cached results for the demo sheets or calls the model; the model call is a stub in this build.
- **Offline.** A service worker caches the app shell; the photo queue lives in IndexedDB with upload progress saved per step, so a dropped connection resumes without creating a duplicate submission.

## Packages

| Path | Purpose |
|---|---|
| `packages/evidence` | sha256, validateArithmetic, compareSubmissions, statusFor, chain functions, narrate. Pure, tested first. |
| `packages/extraction` | Extraction adapter, cached fixtures, stubbed live adapter. |
| `packages/shared` | Shared types. |
| `apps/web/lib/server` | Handlers behind ports; Supabase adapters; tests use in-memory fakes. |
| `database` | Schema, RLS, grants, seed, test pieces. |

## Tests

Over 200 automated tests: integrity engine, extraction contract, server handlers (permissions, privacy, idempotency, audit chain), offline sync, accessibility preferences, and five database tests for RLS and the audit chain that run against the live project.
