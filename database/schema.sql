-- VOTE-GUARD 360 schema. All data is synthetic demo data.
-- Project setting: RLS enabled by default, NO automatic API grants, so every grant is explicit below.

create extension if not exists pgcrypto;

create type app_role as enum ('observer', 'reviewer');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role app_role not null default 'observer',
  org text,
  created_at timestamptz not null default now()
);

create table public.polling_units (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  ward text not null,
  lga text not null,
  state text not null,
  source text not null default 'demo_synthetic',
  -- synthetic "published" ward-level figures used by the collation tracker demo
  published_figures jsonb
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  polling_unit_id uuid not null references public.polling_units (id),
  submitter_id uuid not null references auth.users (id),
  source_type text not null default 'independent' check (source_type in ('official_public', 'independent', 'demo_synthetic')),
  image_path text not null,
  sha256_client text not null check (sha256_client ~ '^[0-9a-f]{64}$'),
  sha256_server text check (sha256_server ~ '^[0-9a-f]{64}$'),
  hash_match boolean,
  captured_at timestamptz not null,
  received_at timestamptz not null default now()
);
create index on public.submissions (polling_unit_id);

create table public.extractions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id),
  machine_values jsonb not null,
  confidence jsonb not null,
  confirmed_values jsonb,            -- observer's fix, kept apart from the machine read
  created_at timestamptz not null default now()
);
create index on public.extractions (submission_id);

create table public.verification_results (
  submission_id uuid primary key references public.submissions (id),
  ok boolean not null,
  checks jsonb not null,
  status text not null
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  polling_unit_id uuid not null references public.polling_units (id),
  reviewer_id uuid not null references auth.users (id),
  decision text not null check (decision in ('matches_1', 'matches_2', 'request_new_photo', 'leave_open')),
  note text not null,
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  type text not null,
  subject_id text not null,
  payload jsonb not null,
  created_at text not null,          -- ISO string, exactly as hashed by packages/evidence
  prev_hash text,
  hash text not null unique check (hash ~ '^[0-9a-f]{64}$')
);

-- ---------------------------------------------------------------- helpers
create or replace function public.is_reviewer() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'reviewer');
$$;

-- ---------------------------------------------------------------- audit trail
-- Append-only: refuse UPDATE, DELETE and TRUNCATE for everyone, including the service role.
create or replace function public.audit_events_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_events is append-only';
end $$;

create trigger audit_events_no_update_delete
  before update or delete on public.audit_events
  for each row execute function public.audit_events_immutable();
create trigger audit_events_no_truncate
  before truncate on public.audit_events
  for each statement execute function public.audit_events_immutable();

-- The hash is computed by packages/evidence (chainAuditEvent). The database enforces the link.
create or replace function public.append_audit_event(p_event jsonb) returns public.audit_events
language plpgsql security definer set search_path = public as $$
declare
  last_hash text;
  row public.audit_events;
begin
  perform pg_advisory_xact_lock(7360360);            -- serialise appends
  select hash into last_hash from public.audit_events order by id desc limit 1;
  if (p_event ->> 'prev_hash') is distinct from last_hash then
    raise exception 'audit chain link mismatch';
  end if;
  insert into public.audit_events (type, subject_id, payload, created_at, prev_hash, hash)
  values (p_event ->> 'type', p_event ->> 'subject_id', p_event -> 'payload',
          p_event ->> 'created_at', p_event ->> 'prev_hash', p_event ->> 'hash')
  returning * into row;
  return row;
end $$;

-- ---------------------------------------------------------------- public views (hide submitter identity)
create view public.submissions_public with (security_invoker = false) as
  select id, polling_unit_id, source_type, image_path, sha256_client, sha256_server, hash_match, captured_at, received_at
  from public.submissions;

create view public.extractions_public with (security_invoker = false) as
  select id, submission_id, machine_values, confidence, confirmed_values, created_at
  from public.extractions;

create view public.reviews_public with (security_invoker = false) as
  select id, polling_unit_id, decision, note, created_at
  from public.reviews;

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.polling_units enable row level security;
alter table public.submissions enable row level security;
alter table public.extractions enable row level security;
alter table public.verification_results enable row level security;
alter table public.reviews enable row level security;
alter table public.audit_events enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
create policy units_read on public.polling_units for select to anon, authenticated using (true);

create policy submissions_insert_own on public.submissions for insert to authenticated
  with check (submitter_id = auth.uid());
create policy submissions_select_own on public.submissions for select to authenticated
  using (submitter_id = auth.uid() or public.is_reviewer());

create policy extractions_select on public.extractions for select to authenticated
  using (public.is_reviewer() or exists (select 1 from public.submissions s where s.id = submission_id and s.submitter_id = auth.uid()));
create policy extractions_confirm_own on public.extractions for update to authenticated
  using (exists (select 1 from public.submissions s where s.id = submission_id and s.submitter_id = auth.uid()))
  with check (exists (select 1 from public.submissions s where s.id = submission_id and s.submitter_id = auth.uid()));

create policy verification_read on public.verification_results for select to anon, authenticated using (true);

create policy reviews_insert_reviewer on public.reviews for insert to authenticated
  with check (public.is_reviewer() and reviewer_id = auth.uid());
create policy reviews_select_reviewer on public.reviews for select to authenticated using (public.is_reviewer());

create policy audit_read on public.audit_events for select to anon, authenticated using (true);
-- no insert/update/delete policy on audit_events: appends go through append_audit_event() only

-- ---------------------------------------------------------------- grants (explicit, minimal)
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant select on public.polling_units, public.verification_results, public.audit_events to anon, authenticated;
grant select on public.submissions_public, public.extractions_public, public.reviews_public to anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert on public.submissions to authenticated;
grant select on public.extractions to authenticated;
grant update (confirmed_values) on public.extractions to authenticated;   -- confirm only; machine values untouched
grant select, insert on public.reviews to authenticated;
grant execute on function public.is_reviewer() to authenticated;
grant all on all tables in schema public to service_role;
grant execute on function public.append_audit_event(jsonb) to service_role;

-- ---------------------------------------------------------------- storage: write-once evidence bucket
insert into storage.buckets (id, name, public) values ('evidence', 'evidence', true)
on conflict (id) do nothing;

create policy evidence_read on storage.objects for select to anon, authenticated using (bucket_id = 'evidence');
create policy evidence_upload_own_folder on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);
-- deliberately no update or delete policy: stored evidence cannot be replaced or removed
