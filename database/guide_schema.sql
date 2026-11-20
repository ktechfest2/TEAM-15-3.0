-- VOTE-GUARD 360 voter guide: candidates and coverage.
-- Real public-record data, each fact with a source link and a check date. Public read, no public write.
-- Project setting: RLS on, NO automatic API grants, so every grant is explicit below.

create table if not exists public.guide_races (
  id text primary key,
  name text not null,
  election_date date not null,
  source_name text not null,
  source_url text not null check (source_url like 'https://%'),
  source_checked_on date not null,
  parties_source_name text not null,
  parties_source_url text not null check (parties_source_url like 'https://%'),
  parties_source_checked_on date not null
);

create table if not exists public.guide_parties (
  code text primary key,
  name text not null
);

create table if not exists public.guide_candidates (
  id text primary key,
  race_id text not null references public.guide_races (id),
  surname text not null,
  given text not null,
  party text not null references public.guide_parties (code),
  age int not null check (age between 18 and 109),
  qualifications text not null,
  running_mate_name text not null,
  running_mate_age int not null check (running_mate_age between 18 and 109),
  running_mate_qualifications text not null,
  remark text
);

-- A row INEC lists with no candidate name (for example under a court order).
create table if not exists public.guide_not_named (
  race_id text not null references public.guide_races (id),
  party text not null references public.guide_parties (code),
  remark text not null,
  primary key (race_id, party)
);

create table if not exists public.guide_outlets (
  id text primary key,
  position int not null,
  name text not null,
  ownership text not null check (ownership in ('private', 'state_owned', 'community', 'international', 'not_confirmed')),
  ownership_source text check (ownership_source like 'https://%'),
  region text not null,
  language text not null check (language in ('en', 'pcm', 'ha', 'yo', 'ig')),
  tracked boolean not null default true,
  -- an ownership claim needs a source; "not confirmed" has none
  check ((ownership = 'not_confirmed') = (ownership_source is null))
);

create table if not exists public.guide_stories (
  id text primary key,
  position int not null,
  title text not null,
  summary text not null,
  official_name text not null,
  official_url text not null check (official_url like 'https://%')
);

create table if not exists public.guide_articles (
  id text primary key,
  story_id text not null references public.guide_stories (id),
  outlet_id text not null references public.guide_outlets (id),
  position int not null,
  headline text not null,
  published_on date not null,
  type text not null check (type in ('news_report', 'opinion', 'sponsored')),
  url text not null check (url like 'https://%'),
  unique (story_id, outlet_id)
);

-- A reviewer's answer is stored with who gave it and when. No rows means "awaiting two reviewers".
create table if not exists public.guide_article_checks (
  article_id text not null references public.guide_articles (id),
  check_name text not null check (check_name in ('names_sources', 'marks_fact_opinion', 'corrections_page')),
  reviewer text not null,
  answer text not null check (answer in ('yes', 'partly', 'no')),
  answered_on date not null,
  seq int not null default 0,
  primary key (article_id, check_name, reviewer)
);

alter table public.guide_races enable row level security;
alter table public.guide_parties enable row level security;
alter table public.guide_candidates enable row level security;
alter table public.guide_not_named enable row level security;
alter table public.guide_outlets enable row level security;
alter table public.guide_stories enable row level security;
alter table public.guide_articles enable row level security;
alter table public.guide_article_checks enable row level security;

create policy guide_races_read on public.guide_races for select to anon, authenticated using (true);
create policy guide_parties_read on public.guide_parties for select to anon, authenticated using (true);
create policy guide_candidates_read on public.guide_candidates for select to anon, authenticated using (true);
create policy guide_not_named_read on public.guide_not_named for select to anon, authenticated using (true);
create policy guide_outlets_read on public.guide_outlets for select to anon, authenticated using (true);
create policy guide_stories_read on public.guide_stories for select to anon, authenticated using (true);
create policy guide_articles_read on public.guide_articles for select to anon, authenticated using (true);
create policy guide_article_checks_read on public.guide_article_checks for select to anon, authenticated using (true);

-- Read only. There is deliberately no insert, update or delete grant for anon or authenticated.
grant select on public.guide_races, public.guide_parties, public.guide_candidates, public.guide_not_named,
  public.guide_outlets, public.guide_stories, public.guide_articles, public.guide_article_checks to anon, authenticated;
