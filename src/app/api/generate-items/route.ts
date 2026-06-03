import { NextResponse } from "next/server";
import { objectiveByCode, itemsForObjective, objectives } from "@/lib/data/content";
import { validateItem } from "@/lib/content/validate";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Item } from "@/lib/types";

export const runtime = "nodejs";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

/**
 * Dynamic item generation (CLAUDE.md §7c). Server-only — the Anthropic key
 * never touches the client. Generated items are GROUNDED in the objective
 * description + a verified seed item, validated against the content contract,
 * and stored inactive (source_kind='generated') until a human spot-checks them.
 * Generation augments — never replaces — the verified seed bank.
 */
export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Generation unavailable: ANTHROPIC_API_KEY is not configured." },
      { status: 501 }
    );
  }

  let body: { objectiveCode?: string; seedItemId?: string; count?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const objective = body.objectiveCode ? objectiveByCode.get(body.objectiveCode) : undefined;
  if (!objective) {
    return NextResponse.json({ error: "Unknown or missing objectiveCode" }, { status: 400 });
  }

  const pool = itemsForObjective(objective.code);
  const seed = body.seedItemId ? pool.find((i) => i.id === body.seedItemId) : pool[0];
  if (!seed) {
    return NextResponse.json({ error: "No seed item available for this objective" }, { status: 400 });
  }
  const count = Math.min(Math.max(body.count ?? 3, 1), 4);

  const system = buildSystemPrompt();
  const userPrompt = buildUserPrompt(objective, seed, count);

  let text: string;
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        // Cache the static rubric so repeated top-ups are cheap.
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json({ error: "Anthropic API error", detail }, { status: 502 });
    }
    const data = await res.json();
    text = data?.content?.[0]?.text ?? "";
  } catch (e) {
    return NextResponse.json({ error: "Generation request failed", detail: String(e) }, { status: 502 });
  }

  const parsed = parseItems(text, objective.code);
  if (!parsed) {
    return NextResponse.json({ error: "Model returned unparseable JSON", raw: text }, { status: 422 });
  }

  // Validate every candidate; only keep clean ones, all flagged inactive.
  const known = new Set(objectives.map((o) => o.code));
  const variantGroup = crypto.randomUUID();
  const accepted: Item[] = [];
  const rejected: { item: Partial<Item>; issues: string[] }[] = [];

  for (const cand of parsed) {
    const item: Item = {
      ...cand,
      id: crypto.randomUUID(),
      objective: objective.code,
      source_kind: "generated",
      variant_group: variantGroup,
      active: false,
      options: cand.options.map((o, i) => ({ ...o, id: `${objective.code}-gen-${i}-${crypto.randomUUID().slice(0, 8)}` })),
    };
    const issues = validateItem(item, known);
    if (issues.length === 0) accepted.push(item);
    else rejected.push({ item, issues: issues.map((x) => x.problem) });
  }

  // Persist accepted (inactive) items when Supabase is configured.
  let inserted = 0;
  const admin = getSupabaseAdmin();
  if (admin && accepted.length) {
    for (const item of accepted) {
      const { error: itemErr } = await admin.from("items").insert({
        id: item.id, objective: item.objective, difficulty: item.difficulty,
        stem: item.stem, explanation: item.explanation, hook: item.hook ?? null,
        source: item.source ?? seed.source ?? null, source_kind: "generated",
        variant_group: item.variant_group, active: false,
      });
      if (itemErr) continue;
      const { error: optErr } = await admin.from("item_options").insert(
        item.options.map((o) => ({ id: o.id, item_id: item.id, text: o.text, is_correct: o.is_correct, distractor_note: o.distractor_note ?? null }))
      );
      if (!optErr) inserted += 1;
    }
  }

  return NextResponse.json({
    objective: objective.code,
    requested: count,
    accepted: accepted.length,
    rejected: rejected.length,
    inserted,
    note: "Generated items are inactive until a human spot-checks them.",
    items: accepted,
    rejections: rejected,
  });
}

function buildSystemPrompt(): string {
  return [
    "You write multiple-choice exam items for the AALAS ALAT (Assistant Laboratory Animal Technician) certification.",
    "You ALWAYS ground each item strictly in the provided objective description and the verified seed item's correct answer, explanation, and source. Never introduce facts, numbers, or citations not supported by that grounding.",
    "Each item must: test the SAME objective/concept as the seed; have exactly 4 options with exactly ONE correct; include a 'why wrong' note for every distractor; include a one-line memory hook; and reuse or narrow the seed's source citation.",
    "Vary the phrasing and scenario framing (some application/scenario items) so the concept — not the wording — is learned. Do not copy the seed verbatim.",
    "Difficulty must be one of: easy, medium, hard.",
    "Return ONLY a JSON array, no prose. Each element:",
    '{ "stem": string, "difficulty": "easy"|"medium"|"hard", "explanation": string, "hook": string, "source": string, "options": [ { "text": string, "is_correct": boolean, "distractor_note"?: string } ] }',
    "Exactly one option per item has is_correct=true; the correct option omits distractor_note; each wrong option includes a concise distractor_note.",
  ].join("\n");
}

function buildUserPrompt(objective: { code: string; title: string; description?: string }, seed: Item, count: number): string {
  const correct = seed.options.find((o) => o.is_correct);
  return JSON.stringify({
    instruction: `Generate ${count} grounded variant item(s) for this objective.`,
    objective: { code: objective.code, title: objective.title, description: objective.description },
    seed_item: {
      stem: seed.stem,
      correct_answer: correct?.text,
      explanation: seed.explanation,
      source: seed.source,
    },
  });
}

type RawOption = { text: string; is_correct: boolean; distractor_note?: string };
type RawItem = Pick<Item, "stem" | "difficulty" | "explanation" | "hook" | "source"> & { options: RawOption[] };

function parseItems(text: string, _objective: string): RawItem[] | null {
  // Tolerate code fences or surrounding prose by extracting the JSON array.
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const arr = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(arr)) return null;
    return arr as RawItem[];
  } catch {
    return null;
  }
}
