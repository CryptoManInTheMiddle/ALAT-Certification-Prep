/**
 * Seed loader — loads the version-controlled content (objectives, items,
 * item_options, lessons, study_plan) into Supabase using the service-role key.
 *
 * Usage (server/CI only — never ship the service-role key to the client):
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx supabase/seed/seed.ts
 *
 * Idempotent: objectives/lessons/study_plan are upserted; seed items are
 * replaced (delete where source_kind='seed', then insert) so the bank stays in
 * sync with the JSON. Generated items (source_kind='generated') are untouched.
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import objectives from "./objectives.json";
import items from "./items.json";
import lessons from "./lessons.json";
import studyPlan from "./study_plan.json";
import { validateBank } from "../../src/lib/content/validate";
import type { Item, Objective } from "../../src/lib/types";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  // Validate before touching the database.
  const known = new Set((objectives as Objective[]).map((o) => o.code));
  const issues = validateBank(items as Item[], known);
  if (issues.length) {
    console.error("Seed validation failed:");
    issues.forEach((i) => console.error(`  ${i.itemId}: ${i.problem}`));
    process.exit(1);
  }

  const db = createClient(url, key, { auth: { persistSession: false } });

  console.log(`Upserting ${objectives.length} objectives…`);
  await db.from("objectives").upsert(objectives).throwOnError();

  console.log(`Upserting ${lessons.length} lessons…`);
  await db.from("lessons").upsert(lessons).throwOnError();

  console.log("Reloading study_plan…");
  await db.from("study_plan").delete().neq("id", -1).throwOnError();
  await db.from("study_plan").insert(studyPlan).throwOnError();

  console.log("Replacing seed items…");
  await db.from("items").delete().eq("source_kind", "seed").throwOnError();

  for (const it of items as Item[]) {
    const itemId = randomUUID();
    await db
      .from("items")
      .insert({
        id: itemId,
        objective: it.objective,
        difficulty: it.difficulty,
        stem: it.stem,
        explanation: it.explanation,
        hook: it.hook ?? null,
        source: it.source ?? null,
        source_kind: "seed",
        active: true,
      })
      .throwOnError();

    await db
      .from("item_options")
      .insert(
        it.options.map((o) => ({
          id: randomUUID(),
          item_id: itemId,
          text: o.text,
          is_correct: o.is_correct,
          distractor_note: o.distractor_note ?? null,
        }))
      )
      .throwOnError();
  }

  console.log(`Done. Loaded ${items.length} verified items.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
