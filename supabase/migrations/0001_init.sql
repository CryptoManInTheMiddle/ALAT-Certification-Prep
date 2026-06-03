-- LabReady — ALAT Certification Prep
-- Phase 1 schema. Multi-user-ready (RLS on user_id) from day one.
-- Seed/content tables are world-readable, admin-writable.
-- User-scoped tables filter user_id = auth.uid().

-- ---------------------------------------------------------------------------
-- Content tables (seeded; world-readable)
-- ---------------------------------------------------------------------------

create table if not exists objectives (
  code          text primary key,
  domain        text not null check (domain in ('I', 'II')),
  title         text not null,
  blueprint_wt  numeric not null,
  description   text
);

create table if not exists items (
  id            uuid primary key default gen_random_uuid(),
  objective     text not null references objectives(code),
  difficulty    text not null check (difficulty in ('easy', 'medium', 'hard')),
  stem          text not null,
  explanation   text not null,
  hook          text,
  source        text,
  source_kind   text not null default 'seed' check (source_kind in ('seed', 'generated')),
  variant_group uuid,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists items_objective_idx on items(objective);
create index if not exists items_active_idx on items(active);

create table if not exists item_options (
  id              uuid primary key default gen_random_uuid(),
  item_id         uuid not null references items(id) on delete cascade,
  text            text not null,
  is_correct      boolean not null default false,
  distractor_note text
);
create index if not exists item_options_item_idx on item_options(item_id);

create table if not exists lessons (
  objective text primary key references objectives(code),
  body      text not null
);

create table if not exists study_plan (
  id      bigint generated always as identity primary key,
  week    int not null,
  day     text not null,
  topic   text not null,
  chapter text
);

-- ---------------------------------------------------------------------------
-- User-scoped tables (RLS-protected)
-- ---------------------------------------------------------------------------

create table if not exists review_state (
  user_id     uuid not null references auth.users(id) on delete cascade,
  item_id     uuid not null references items(id) on delete cascade,
  stability   numeric,
  difficulty  numeric,
  due_at      timestamptz,
  last_review timestamptz,
  reps        int not null default 0,
  lapses      int not null default 0,
  state       int not null default 0,  -- ts-fsrs State enum
  primary key (user_id, item_id)
);
create index if not exists review_state_due_idx on review_state(user_id, due_at);

create table if not exists objective_mastery (
  user_id   uuid not null references auth.users(id) on delete cascade,
  objective text not null references objectives(code),
  mastery   numeric not null default 0,
  attempts  int not null default 0,
  due_at    timestamptz,
  primary key (user_id, objective)
);

create table if not exists attempts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  item_id         uuid not null references items(id) on delete cascade,
  selected_option uuid references item_options(id),
  correct         boolean not null,
  confidence      int check (confidence between 1 and 3),
  mode            text not null check (mode in ('learn', 'practice', 'drill', 'exam', 'review')),
  latency_ms      int,
  created_at      timestamptz not null default now()
);
create index if not exists attempts_user_idx on attempts(user_id, created_at desc);

create table if not exists sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  mode       text not null,
  total      int not null default 0,
  correct    int not null default 0,
  score      numeric,
  readiness  numeric,
  started_at timestamptz not null default now(),
  ended_at   timestamptz
);
create index if not exists sessions_user_idx on sessions(user_id, started_at desc);

create table if not exists notes (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  body       text,
  updated_at timestamptz not null default now()
);

create table if not exists study_plan_progress (
  user_id   uuid not null references auth.users(id) on delete cascade,
  plan_id   bigint not null references study_plan(id) on delete cascade,
  done_at   timestamptz not null default now(),
  primary key (user_id, plan_id)
);

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

-- Content: world-readable, no public writes (service-role / admin seeds only).
alter table objectives    enable row level security;
alter table items         enable row level security;
alter table item_options  enable row level security;
alter table lessons       enable row level security;
alter table study_plan    enable row level security;

do $$
declare t text;
begin
  foreach t in array array['objectives','items','item_options','lessons','study_plan'] loop
    execute format('drop policy if exists "%s_read" on %I', t, t);
    execute format('create policy "%s_read" on %I for select using (true)', t, t);
  end loop;
end $$;

-- User-scoped: owner-only full access.
alter table review_state         enable row level security;
alter table objective_mastery    enable row level security;
alter table attempts             enable row level security;
alter table sessions             enable row level security;
alter table notes                enable row level security;
alter table study_plan_progress  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['review_state','objective_mastery','attempts','sessions','notes','study_plan_progress'] loop
    execute format('drop policy if exists "%s_owner" on %I', t, t);
    execute format(
      'create policy "%s_owner" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t, t
    );
  end loop;
end $$;
