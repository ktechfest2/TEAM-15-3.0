-- VOTE-GUARD 360 candidate pages: speeches, videos, publications, and photo / logo credits.
-- Run after guide_schema.sql. Public read, no public write. RLS on, explicit grants (the project has no automatic API grants).
-- The same limits for every candidate are enforced in the app's loader and in tests; here the shape is enforced.

create table if not exists public.guide_candidate_items (
  id text primary key,
  candidate_id text not null references public.guide_candidates (id),
  kind text not null check (kind in ('speech', 'video', 'publication')),
  title text not null check (length(trim(title)) > 0),
  url text not null check (url like 'https://%'),
  publisher text not null check (length(trim(publisher)) > 0),
  publisher_type text not null check (publisher_type in ('candidate', 'party', 'outlet', 'official', 'academic')),
  published_on date not null,
  checked_on date not null,
  opinion boolean not null,
  language text,
  occasion text,
  place text,
  length text,
  excerpt text check (excerpt is null or (kind = 'speech' and length(excerpt) <= 300))
);
create index if not exists guide_candidate_items_candidate on public.guide_candidate_items (candidate_id, kind, published_on desc);

-- A photo (key = candidate id) or a party logo (key = party code), each with where it came from and its licence.
create table if not exists public.guide_images (
  id text primary key,
  kind text not null check (kind in ('photo', 'logo')),
  key text not null,
  url text not null check (url like 'https://%'),
  page_url text not null check (page_url like 'https://%'),
  author text not null check (length(trim(author)) > 0),
  license text not null check (length(trim(license)) > 0),
  license_url text not null check (license_url like 'https://%')
);

alter table public.guide_candidate_items enable row level security;
alter table public.guide_images enable row level security;

drop policy if exists guide_candidate_items_read on public.guide_candidate_items;
drop policy if exists guide_images_read on public.guide_images;
create policy guide_candidate_items_read on public.guide_candidate_items for select to anon, authenticated using (true);
create policy guide_images_read on public.guide_images for select to anon, authenticated using (true);

-- Read only. There is deliberately no insert, update or delete grant for anon or authenticated.
grant select on public.guide_candidate_items, public.guide_images to anon, authenticated;
