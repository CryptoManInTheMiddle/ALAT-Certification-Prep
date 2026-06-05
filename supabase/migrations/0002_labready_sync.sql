-- LabReady cloud sync — REUSE-A-PROJECT edition.
--
-- The 126-question bank and lessons are bundled in the app and work offline, so
-- Supabase only needs to store each user's PROGRESS. This adds a single,
-- prefixed table (lr_progress) so it can live safely inside an existing Supabase
-- project alongside another app without touching its tables. Fully reversible:
--   drop table lr_progress;
--
-- Multi-user: one row per user, isolated by Row-Level Security (user_id =
-- auth.uid()). Magic-link sign-in is configured in the Supabase dashboard
-- (Authentication settings), no SQL required.

create table if not exists lr_progress (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table lr_progress enable row level security;

-- Each user can read/write only their own row.
drop policy if exists "lr_progress_owner" on lr_progress;
create policy "lr_progress_owner" on lr_progress
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
