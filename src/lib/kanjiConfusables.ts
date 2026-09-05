/**
 * Which kanji are mistaken for which, read from the committed file.
 *
 * The pairing is a fact about the characters, not about a member, so it lives
 * in `src/data/kanjiConfusables.json` and nothing here touches the database.
 * That is also what lets a page show it for the 134 joyo kanji WaniKani never
 * teaches, which have no catalogue row to hang a relation off.
 *
 * Why the site says this at all: measured against our own ladder, eleven of
 * the twelve classic pairs sit in different JLPT bands and a median of 21
 * levels apart — 土 is N5 and 士 is N1 — so no ordering rule can put them side
 * by side without breaking the promise that N5 finishes at level 10. The
 * second of a pair always arrives after the first, and naming it there is what
 * a member can actually use.
 *
 * Regenerate with `pnpm build:kanji-confusables`.
 */
import confusablesData from "@/data/kanjiConfusables.json";

import {
  CONFUSABLE_SOURCES,
  type ConfusableNeighbour,
  type ConfusableSource,
  type KanjiConfusables,
} from "./kanjiConfusables.types";

const confusables = confusablesData as KanjiConfusables;

const CONFUSABLE_SOURCE_VALUES: readonly string[] = Object.values(CONFUSABLE_SOURCES);

export function isConfusableSource(value: string): value is ConfusableSource {
  return CONFUSABLE_SOURCE_VALUES.includes(value);
}

/**
 * The characters this one is mistaken for, strongest first.
 *
 * Empty for most of the alphabet and for every character outside the joyo set:
 * 1,752 have an entry, which is 78% of the ladder. A caller draws nothing
 * rather than a heading over nothing.
 */
export function confusablesFor(character: string): ConfusableNeighbour[] {
  return confusables.neighbours[character] ?? [];
}

/** Whether the two are a known pair, in either direction. */
export function areConfusable(one: string, other: string): boolean {
  return confusablesFor(one).some((neighbour) => neighbour.kanji === other);
}

/** What the accreditation page reports: how much of this we hold. */
export function confusableCounts(): { pairs: number; characters: number; bySource: Record<ConfusableSource, number> } {
  return {
    pairs: confusables.pairs,
    characters: Object.keys(confusables.neighbours).length,
    bySource: confusables.source,
  };
}

/** Every character that has a pairing, for the accreditation browser. */
export function confusableEntries(): [string, ConfusableNeighbour[]][] {
  return Object.entries(confusables.neighbours);
}

export function confusablesGeneratedAt(): string {
  return confusables.generatedAt;
}

export { CONFUSABLE_SOURCES };
export type { ConfusableNeighbour, ConfusableSource };
