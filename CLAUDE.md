# CLAUDE.md — ALAT Certification Prep App (“LabReady”)

> **How to use this file:** Claude Code reads it automatically at the start of every session. It is the single source of truth for what we're building, the learning principles that must be honored, the data model, and the build order. Start a session with: *“Read CLAUDE.md and continue from the current phase in the build plan.”* See **PROGRESS.md** for current status.

---

## 1. Mission

Build a **mobile-first, installable web app** that gets the user **certification-ready** for the AALAS **ALAT (Assistant Laboratory Animal Technician)** exam.

This is **not a flashcard app**. It is an **adaptive learning system** built on proven learning science. Flashcards are one small mode inside a larger engine whose job is to *move concepts into long-term memory and prove exam readiness.*

### Non-negotiable outcomes

1. **Dynamic** — questions rotate constantly; answer options shuffle every render; the engine surfaces what's needed *now*.
2. **Learning-driven** — teaches, checks, remediates, and spaces. Tracks mastery per *learning objective*.
3. **Certification-ready** — mapped to the ALAT Exam Content Outline with a calibrated readiness score and a 120-question / 2-hour simulator.
4. **Phone-accessible** — a PWA, installable, offline-capable, syncing via Supabase auth.

## 2. Tech stack

Next.js 14+ (App Router) · Tailwind + design tokens · Zustand + TanStack Query · Supabase (Postgres + Auth + RLS + Realtime) · Supabase magic-link auth · Anthropic API (server-only generation) · PWA (service worker + manifest) · Vercel + Supabase deploy · Recharts.

Secrets live in `.env.local` / Vercel env vars: `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only). Never ship the Anthropic key or service-role key to the client.

## 3. Learning-science principles (the differentiator)

1. **Active recall over recognition.** Retrieval before reveal; passive recognition is capped.
2. **Spaced repetition (FSRS).** Schedule every objective and item; surface *due* first.
3. **Interleaving.** Mix domains within a set.
4. **Adaptive difficulty.** Serve items just above current mastery.
5. **Elaborative feedback.** Wrong answer → why-correct → why each distractor is wrong → hook → source → re-queue.
6. **Variation.** Shuffle option order every render; store correctness by stable `option_id`, never index.
7. **Mastery-based progression** mapped to the exam blueprint.
8. **Confidence calibration.** Flag “confident but wrong” for priority remediation.
9. **Just-in-time teaching.** Learn mode fuses teaching + testing.

## 4. Study modes

Learn · Practice (adaptive) · Drill (weak spots) · Simulate (exam) · Review (spaced).

## 5. ALAT blueprint

- 120 MCQ (1 correct + 3 distractors), 2-hour limit, single-best-answer, pass cut ≈ 70–75%.
- Domain I — Animal Husbandry, Health & Welfare ≈ **75%**; Domain II — Facility Administration & Management ≈ **25%**.
- Objectives (seeded in `supabase/seed/objectives.json`): REG, IAC, 3RS, ENV, CAGE, SAN, FAC, FEED, HUS, SPM, SPR, SPS, SPB, SPN, SPO, OHS, GEN, ANE, EUT, RES.

## 6. Data model

See `supabase/migrations/0001_init.sql`. Tables: `objectives`, `items`, `item_options`, `review_state`, `objective_mastery`, `attempts`, `sessions`, `lessons`, `study_plan`, `notes`, `study_plan_progress`. RLS on every user-scoped table (`user_id = auth.uid()`); content tables world-readable, admin-writable.

## 7. The engines (core IP — `src/lib/engine/`)

- **Scheduler** (`scheduler.ts`): overdue → weak objectives → confident-but-wrong → coverage gaps → interleave (never >2 same-objective in a row).
- **FSRS** (`fsrs.ts`): `ts-fsrs`; grade derived from correctness + latency + confidence.
- **Mastery** (`mastery.ts`): difficulty-weighted EWMA per objective.
- **Readiness** (`readiness.ts`): `Σ blueprint_wt × min(mastery, coverage_factor)`, plain-language bands.
- **Generation** (`/api/generate-items`): server-only, grounded in objective + seed item, strict-JSON output, validated (`src/lib/content/validate.ts`), variant-grouped, stored inactive until human review. Augments — never replaces — the verified seed bank.

## 8. Content / seed bank

Seed under `supabase/seed/` (`objectives.json`, `items.json`, `lessons.json`, `study_plan.json`) loaded by `seed.ts`. Every item: objective tag, difficulty, 4 options (one correct), explanation, per-distractor why-wrong notes, memory hook, source citation. Launch target ≥150 verified items (≈112 Domain I / ≈38 Domain II) and ≥5 per objective; grow via the generation pipeline.

## 9. PWA / mobile

Manifest, offline service worker (caches shell + bank, queues attempts offline), mobile-first bottom tab bar, magic-link auth, install prompt.

## 10. Screens

Home/Dashboard · Learn · Practice · Simulate · Review · Drill · Progress · Notes.

## 11. Build plan

Phase 0 Scaffold · 1 Data + seed · 2 Practice engine · 3 Spaced repetition · 4 Simulator + readiness · 5 Learn/Drill/Notes/Progress · 6 Generation pipeline · 7 PWA + offline sync + polish. Commit at each checkpoint; keep **PROGRESS.md** current.

## 12. Definition of “certification-ready”

See the acceptance checklist in **PROGRESS.md**.

## 13. Guardrails

- **Accuracy first.** Medical/regulatory content — never invent facts, numbers, or citations. Ground generated items; flag uncertainty for human review.
- **No secret leakage.** Anthropic + service-role keys server-only.
- **Honor the learning principles** in every feature.
- **Mobile-first, always.**
- **Incremental + committed.** Finish a phase, verify, commit, update PROGRESS.md.
- **Ask before destructive DB changes.**
