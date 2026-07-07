-- ─────────────────────────────────────────────────────────────────
-- School Election Software — Supabase Schema
-- Run this in Supabase SQL Editor before first use.
-- ─────────────────────────────────────────────────────────────────

-- Candidates table
create table if not exists candidates (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  session     text        not null check (session in ('lp', 'up')),
  photo_url   text,
  symbol_url  text,
  vote_count  integer     not null default 0,
  created_at  timestamptz not null default now()
);

-- Settings table (always exactly one row, id = 1)
create table if not exists settings (
  id            integer primary key,
  lp_published  boolean not null default false,
  up_published  boolean not null default false,
  lp_winner_id  uuid references candidates(id),
  up_winner_id  uuid references candidates(id)
);

-- Seed the single settings row
insert into settings (id, lp_published, up_published)
values (1, false, false)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────
-- RPC: increment_vote
-- Called by the booth page on every vote cast.
-- Runs as SECURITY DEFINER so the anon key can update vote_count
-- regardless of RLS policies.
-- ─────────────────────────────────────────────────────────────────
create or replace function increment_vote(candidate_id uuid)
returns void
language sql
security definer
as $$
  update candidates
  set vote_count = vote_count + 1
  where id = candidate_id;
$$;

-- ─────────────────────────────────────────────────────────────────
-- Row Level Security
-- The app uses the anon key for all operations (admin auth is
-- handled by a server-side cookie, not Supabase Auth).
-- These policies allow the anon role full access to both tables.
-- Tighten for production if needed.
-- ─────────────────────────────────────────────────────────────────
alter table candidates enable row level security;
alter table settings    enable row level security;

-- candidates: full access for anon
drop policy if exists "anon_all_candidates" on candidates;
create policy "anon_all_candidates"
  on candidates for all
  to anon
  using (true)
  with check (true);

-- settings: full access for anon
drop policy if exists "anon_all_settings" on settings;
create policy "anon_all_settings"
  on settings for all
  to anon
  using (true)
  with check (true);
