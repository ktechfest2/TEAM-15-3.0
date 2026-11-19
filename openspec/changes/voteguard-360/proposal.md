# Proposal

## Why

After a Nigerian election, polling-unit result sheets are posted on the wall and photographed, but citizens and observers struggle to preserve those photos with proof of origin, check the numbers, compare independent photos, or trace them to later announcements. This is the "Every Vote, Every Voice" hackathon challenge (one weak link, 48 hours, deadline 09:00 on 2026-11-20). We pick the weak link of **preserving, verifying and tracing polling-unit result evidence**, and make it usable by people with weak connectivity, low literacy, low vision, or no English.

## What Changes

Build **VOTE-GUARD 360**, a mobile-first web app (PWA) that is an independent evidence layer. It is not an official INEC system, never declares winners and never accuses anyone.

- Observers photograph a result sheet; a SHA-256 fingerprint is taken on the phone at capture time, even offline, and the upload syncs later.
- The server stores the original image write-once, re-checks the hash, extracts the figures with Claude vision, and runs arithmetic checks.
- Independent submissions for the same polling unit are compared field by field; differences go to a human review queue.
- A public dashboard shows evidence, extracted values, neutral status labels, audit history and a unit-to-ward collation roll-up (synthetic data, clearly labelled).
- An access layer makes the same information usable by everyone: "Listen to this result sheet", an accessibility mode, and easy-read status text in English and Nigerian Pidgin.

Out of scope: real INEC/IReV data import (adapter interface only), voter lookup, incident reporting, logistics, voice/USSD channels, public submissions, barrier reports. These appear as a roadmap slide only.

## Capabilities

### New Capabilities
- `evidence-capture`: offline-capable photo capture, on-device fingerprinting, queued sync, write-once storage
- `result-verification`: OCR extraction, arithmetic validation, cross-submission comparison, status rules
- `audit-trail`: append-only, hash-chained audit events
- `public-evidence-dashboard`: polling-unit explorer, evidence viewer, collation tracker, neutral status display
- `human-review`: reviewer queue and recorded decisions
- `access-layer`: Listen narration, accessibility mode, easy-read status text

### Modified Capabilities
<!-- none: greenfield project -->

## Impact

- New repo content: Next.js app (`apps/web`), shared packages (`packages/evidence`, `packages/shared`), Supabase schema and seed (`database/`), docs and sample sheets.
- External services: Supabase (Auth, Storage, Postgres), Vercel (hosting), Anthropic API (vision extraction, server-side key only).
- Hackathon obligations: public GitHub repo, `CREDITS.md`, declaration of Claude Code as an AI coding assistant, synthetic-data labels, README limitations, 3-minute demo video and live demo link.
