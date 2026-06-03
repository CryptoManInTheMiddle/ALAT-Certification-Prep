# LabReady — ALAT Certification Prep

A mobile-first, installable **PWA** that gets you certification-ready for the
AALAS **ALAT (Assistant Laboratory Animal Technician)** exam. Not a flashcard
app — an adaptive learning system built on active recall, **spaced repetition
(FSRS)**, interleaving, adaptive difficulty, and a blueprint-mapped readiness
score with a full **120-question / 2-hour** simulator.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000 — runs fully offline, no credentials needed
```

The app works immediately against the bundled, version-controlled seed bank,
persisting all progress to `localStorage`. No Supabase or Anthropic key is
required for local study.

```bash
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm test           # vitest (engine + content-contract tests)
```

## Study modes

| Mode | What it does |
|------|--------------|
| **Learn** | Micro-lesson → immediate retrieval checks → schedules into FSRS. |
| **Practice** | Adaptive, interleaved set; shuffled options; rich feedback. |
| **Drill** | Targets weak objectives, confident-but-wrong, and recent misses. |
| **Simulate** | 120 items, 2-hour timer, mark-for-review, no feedback until submit. |
| **Review** | Serves only FSRS-due items. |

## Optional: Supabase + AI generation

Copy `.env.example` to `.env.local` and fill in values to enable cross-device
sync (Supabase) and the dynamic item-generation pipeline (Anthropic).

```bash
# 1. Apply the schema (RLS included)
psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql
# 2. Load verified content (service-role key; server/CI only)
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx supabase/seed/seed.ts
```

The Anthropic key and Supabase service-role key are **server-only** — used by
`/api/generate-items` and the seed loader, never shipped to the client.

See **[PROGRESS.md](./PROGRESS.md)** for build status, architecture notes, and
the acceptance checklist. The learning-science requirements and data model live
in **[CLAUDE.md](./CLAUDE.md)**.

## Tech

Next.js 14 (App Router) · Tailwind · Zustand · `ts-fsrs` · Recharts ·
Supabase (Postgres + Auth + RLS) · Anthropic API · PWA (offline service worker).
