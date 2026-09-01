import { SUBJECT_TYPES } from "./domainConstants";
import type { SearchHit } from "./globalSearch";

/**
 * What kind of thing a result is, which is the question the flat list could
 * not answer.
 *
 * Results were one ranked column with a pill on each row saying which
 * catalogue it came from. That answers "where does this live", and it was the
 * right first question. It is not the question somebody has in front of forty
 * rows: searching 中 returns the kanji, the radical drawn the same way, and
 * thirty-odd words that contain it, and a reader looking for the character has
 * to read past the words to find it. Which catalogue holds a row is an
 * attribute of the row; what kind of thing it is decides whether the row is
 * worth reading at all.
 *
 * So kind is the axis the page is cut along, and the source stays as a pill.
 * Three kinds, because that is what the site teaches - Jisho's fourth section
 * is names, and no catalogue here holds any.
 */

export const SEARCH_KINDS = {
  words: "words",
  kanji: "kanji",
  radicals: "radicals",
} as const;

export type SearchKind = (typeof SEARCH_KINDS)[keyof typeof SEARCH_KINDS];

export const SEARCH_KIND_VALUES = Object.values(SEARCH_KINDS) as SearchKind[];

export function isSearchKind(value: string): value is SearchKind {
  return (SEARCH_KIND_VALUES as string[]).includes(value);
}

/** Display names, one place, for the locale layer to swap. */
export const SEARCH_KIND_LABELS: Record<SearchKind, string> = {
  [SEARCH_KINDS.words]: "Words",
  [SEARCH_KINDS.kanji]: "Kanji",
  [SEARCH_KINDS.radicals]: "Radicals",
};

/**
 * The order sections fall back to when nothing distinguishes them.
 *
 * Words first because most searches are for a word, and radicals last because
 * they are components rather than things you set out to look up.
 */
export const SEARCH_KIND_ORDER: SearchKind[] = [
  SEARCH_KINDS.words,
  SEARCH_KINDS.kanji,
  SEARCH_KINDS.radicals,
];

export function kindForHit(hit: SearchHit): SearchKind {
  if (hit.subjectType === SUBJECT_TYPES.radical) return SEARCH_KINDS.radicals;
  if (hit.subjectType === SUBJECT_TYPES.vocabulary) return SEARCH_KINDS.words;
  return SEARCH_KINDS.kanji;
}

/** A hit belongs to the kind asked for, or every kind when none was. */
export function hitMatchesKind(hit: SearchHit, kind: SearchKind | null): boolean {
  return kind === null || kindForHit(hit) === kind;
}

export type KindCounts = Record<SearchKind, number>;

export function countByKind(hits: SearchHit[]): KindCounts {
  const counts: KindCounts = {
    [SEARCH_KINDS.words]: 0,
    [SEARCH_KINDS.kanji]: 0,
    [SEARCH_KINDS.radicals]: 0,
  };
  for (const hit of hits) counts[kindForHit(hit)] += 1;
  return counts;
}

export type SearchSection = { kind: SearchKind; hits: SearchHit[] };

/**
 * The sections, best answer first.
 *
 * Not a fixed order, because a fixed order is wrong half the time here.
 * Searching 水 the character means the kanji, and Words-always-first would bury
 * it under every compound that contains it; searching "water" means the word.
 * The hits are already ranked, so the section holding the best one leads, and
 * the fixed order only settles ties. Empty kinds are dropped rather than
 * rendered as a heading over nothing.
 */
export function sectionsFor(hits: SearchHit[]): SearchSection[] {
  const grouped = new Map<SearchKind, SearchHit[]>();
  for (const hit of hits) {
    const kind = kindForHit(hit);
    const held = grouped.get(kind);
    if (held) held.push(hit);
    else grouped.set(kind, [hit]);
  }

  return SEARCH_KIND_ORDER.filter((kind) => (grouped.get(kind)?.length ?? 0) > 0)
    .map((kind) => ({ kind, hits: grouped.get(kind)! }))
    .sort((left, right) => {
      const best = (section: SearchSection) => section.hits[0]?.score ?? 0;
      if (best(left) !== best(right)) return best(right) - best(left);
      return SEARCH_KIND_ORDER.indexOf(left.kind) - SEARCH_KIND_ORDER.indexOf(right.kind);
    });
}
