# LabReady — Build Progress

_Adaptive, learning-science-driven prep for the AALAS **ALAT** certification exam._

Last updated: 2026-06-03

## How this build is architected

The app **runs fully offline today** with zero external credentials: the seed
bank is bundled and version-controlled, and all user progress (FSRS schedule,
mastery, attempts, sessions, notes) persists to `localStorage`. The data layer
is **Supabase-ready** — when `NEXT_PUBLIC_SUPABASE_URL` / `..._ANON_KEY` are set,
the clients in `src/lib/supabase/*` activate and the schema in
`supabase/migrations/0001_init.sql` (with RLS) + `supabase/seed/seed.ts` load the
same content server-side. The Anthropic generation key is **server-only**
(`/api/generate-items`) and verified absent from the client bundle.

```
npm run dev        # local dev (offline, localStorage-backed)
npm run build      # production build (green)
npm run typecheck  # tsc --noEmit (clean)
npm test           # vitest — 16 passing engine + content tests
```

## Phase status

| Phase | Scope | Status |
|------|-------|--------|
| 0 | Scaffold: Next 14 App Router, Tailwind, TS, clinical dark tokens | ✅ Done |
| 1 | Schema + RLS, objectives/lessons/study-plan seed, 126 verified items, validator | ✅ Done |
| 2 | Practice engine: id-based shuffle, latency/confidence, rich feedback, attempts, scheduler | ✅ Done |
| 3 | FSRS (`ts-fsrs`), `review_state` + `objective_mastery`, due-only Review | ✅ Done |
| 4 | 120-Q blueprint-weighted timed simulator, readiness score + dashboard | ✅ Done |
| 5 | Learn mode, Drill, Notes, Progress analytics (trend/radar/calibration) | ✅ Done |
| 6 | Generation pipeline: grounded `/api/generate-items`, JSON validation, variant grouping, inactive-until-reviewed | ✅ Built (needs `ANTHROPIC_API_KEY` to run live) |
| 7 | PWA: manifest, offline service worker, install prompt, mobile-first UI | ✅ Done (see icon note below) |

## What's implemented

- **Engines** (`src/lib/engine/`): FSRS wrapper, EWMA difficulty-weighted mastery,
  blueprint readiness with saturating coverage factor, adaptive scheduler
  (overdue → weak → confident-wrong → coverage, with ≤2-in-a-row interleaving),
  id-based option shuffle, grade derivation. **16 unit tests** cover the rules.
- **Five study modes**: Learn, Practice (adaptive/interleaved), Drill (weak +
  confident-wrong + recent misses), Simulate (2h/120-Q), Review (due-only).
- **Screens**: Home dashboard (readiness gauge, domain stats, due/streak, daily
  tip), Learn, Practice, Simulate, Review, Drill, Progress, Notes.
- **PWA**: installable manifest, offline service worker caching the app shell +
  bundled bank, "Add to Home Screen" prompt.

## Known gaps / next steps

1. **Seed bank size.** 126 human-verified items cover all 20 objectives
   (5–8 each — the ≥5-per-objective launch bar is met and test-enforced),
   including a set of genus/species binomial-nomenclature items. Total is still
   short of the **≥150** stretch target; grow via the Phase 6 generation pipeline
   (each candidate validated + held inactive for human spot-check) plus continued
   manual authoring. _Accuracy guardrail: do not activate generated items without
   review._
2. **PWA icons are SVG.** `public/icons/*.svg` install fine on modern Chrome;
   add rasterized 192/512 PNGs for broadest store/Lighthouse compatibility.
3. **Cloud sync — built, awaiting live keys.** Because the 126-item bank is
   bundled (offline), Supabase only stores per-user PROGRESS as a single prefixed
   `lr_progress` JSONB row (so it can reuse an existing Supabase project without
   touching other apps). Magic-link auth (`/account`), a non-destructive
   local↔cloud merge on sign-in, and debounced push-on-change are implemented and
   stay dormant until `NEXT_PUBLIC_SUPABASE_URL` / `..._ANON_KEY` are set. To go
   live: run `supabase/migrations/0002_labready_sync.sql`, set the Supabase Site
   URL/redirect to the Vercel domain, add the two env vars in Vercel, redeploy.
   Multi-user is handled by RLS (`user_id = auth.uid()`) — every user is isolated.
4. **Readiness band calibration.** Bands use the spec's defaults; calibrate
   against accumulated simulator scores over time.
5. **PNG icons / 150+ bank** remain the polish items above.

## Acceptance checklist (CLAUDE.md §12)

- [x] Answer options shuffle every render; correctness stored by `option_id`.
- [x] FSRS scheduling live; Review serves only due items; per-objective mastery.
- [x] Adaptive difficulty + interleaving (no >2 same-objective in a row — tested).
- [x] 120-Q / 2-hour simulator, blueprint domain mix, readiness snapshot.
- [x] Readiness score + plain-language band on the dashboard.
- [x] Wrong answers show why-correct + per-distractor why-wrong + hook + source.
- [x] Installable PWA; offline practice works (bundled bank + service worker).
- [x] Generation pipeline built with grounding + validation + human-review flag.
- [x] No secrets in client bundle (verified).
- [x] ≥5 verified items per objective _(126 items, 5–8 each — test-enforced)._
- [ ] ≥150 total verified items _(currently 126 — stretch target, see gap #1)._
- [x] Deployed on Vercel (alat-certification-prep.vercel.app).
- [x] Multi-user cloud sync built (RLS-isolated `lr_progress`) — awaiting live keys (gap #3).
- [x] Magic-link login UI on phone (`/account`) — awaiting live keys (gap #3).
