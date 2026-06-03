import type { Item } from "@/lib/types";

export interface ValidationIssue {
  itemId: string;
  problem: string;
}

/**
 * Validate an item against the content contract (CLAUDE.md §7c):
 *  - exactly 4 options
 *  - exactly one correct option
 *  - non-empty stem and explanation
 *  - every wrong option carries a "why wrong" distractor note
 *  - stable, unique option ids
 *
 * Used both to gate the seed bank and to validate AI-generated items before
 * they are inserted (generated items stay inactive until they pass + spot-check).
 */
export function validateItem(item: Item, knownObjectives?: Set<string>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const id = item.id ?? "(no id)";

  if (!item.stem || item.stem.trim().length === 0) {
    issues.push({ itemId: id, problem: "empty stem" });
  }
  if (!item.explanation || item.explanation.trim().length === 0) {
    issues.push({ itemId: id, problem: "empty explanation" });
  }
  if (knownObjectives && !knownObjectives.has(item.objective)) {
    issues.push({ itemId: id, problem: `unknown objective '${item.objective}'` });
  }
  if (!["easy", "medium", "hard"].includes(item.difficulty)) {
    issues.push({ itemId: id, problem: `invalid difficulty '${item.difficulty}'` });
  }

  const opts = item.options ?? [];
  if (opts.length !== 4) {
    issues.push({ itemId: id, problem: `expected 4 options, found ${opts.length}` });
  }
  const correct = opts.filter((o) => o.is_correct);
  if (correct.length !== 1) {
    issues.push({ itemId: id, problem: `expected exactly 1 correct option, found ${correct.length}` });
  }
  const ids = new Set<string>();
  for (const o of opts) {
    if (!o.text || o.text.trim().length === 0) {
      issues.push({ itemId: id, problem: "an option has empty text" });
    }
    if (!o.id || ids.has(o.id)) {
      issues.push({ itemId: id, problem: `duplicate or missing option id '${o.id}'` });
    }
    ids.add(o.id);
    if (!o.is_correct && (!o.distractor_note || o.distractor_note.trim().length === 0)) {
      issues.push({ itemId: id, problem: `distractor '${o.id}' is missing a why-wrong note` });
    }
  }

  return issues;
}

export function validateBank(items: Item[], knownObjectives?: Set<string>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenIds = new Set<string>();
  for (const item of items) {
    if (seenIds.has(item.id)) {
      issues.push({ itemId: item.id, problem: "duplicate item id" });
    }
    seenIds.add(item.id);
    issues.push(...validateItem(item, knownObjectives));
  }
  return issues;
}
