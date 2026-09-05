import { kanjiPlacement } from "@/lib/kanjiLadder";

import { SUBJECT_TYPES, isSubjectType, type SubjectType } from "./domainConstants";
import { subjectHref } from "./globalSearch";
import { resolveSubjectGlyph } from "./radicalGlyphs";

/**
 * What a subject connects to, on the pages anybody can read.
 *
 * The study surfaces have always shown this - the glyph viewer puts the
 * radicals a kanji is built from, the words that use it and the kanji it is
 * easily confused with right under the character - and the public pages showed
 * one of the four. A word page listed the kanji it was written with and
 * stopped; the kanji page never touched the catalogue at all, so the page a
 * shared link opens knew less about 水 than the page behind the sign-in wall.
 *
 * A kanji is worth reading for what it appears in, which is the whole reason
 * to look one up: 水 on its own is a fact, and 水曜日, 水泳, 水中 are what
 * knowing it buys.
 *
 * Kept as maths over rows so the grouping can be tested without a database.
 */

/** A catalogue row, reduced to what a cross-reference needs. */
export type RelatedRow = {
  subjectId: number;
  subjectType: string;
  level: number;
  characters: string | null;
  slug: string | null;
  meaning: string | null;
  reading: string | null;
};

export type RelatedSubject = {
  subjectId: number;
  subjectType: SubjectType;
  /** What to draw: the characters, or a drawn radical's name. */
  label: string;
  meaning: string | null;
  reading: string | null;
  level: number;
  /** Ours, for a kanji the ladder carries; a word's UK level lives in the database. */
  ukLevel: number | null;
  href: string;
};

export const RELATED_GROUPS = {
  builtFrom: "built-from",
  usedIn: "used-in",
  sharesKanji: "shares-kanji",
} as const;

export type RelatedGroupId = (typeof RELATED_GROUPS)[keyof typeof RELATED_GROUPS];

export type RelatedGroup = { id: RelatedGroupId; items: RelatedSubject[] };

/**
 * How many of a group are worth drawing.
 *
 * 一 appears in hundreds of words. All of them is a page nobody scrolls; a
 * couple is a tease. This is the number that still reads as a list.
 */
export const RELATED_LIMIT = 30;

/**
 * A row as something to link to, or null.
 *
 * Null where the catalogue could not name it - a radical with no slug and no
 * characters has no address, and a chip that goes nowhere is worse than an
 * absent one.
 */
export function toRelatedSubject(row: RelatedRow): RelatedSubject | null {
  if (!isSubjectType(row.subjectType)) return null;

  const href = subjectHref({
    subjectType: row.subjectType,
    characters: row.characters,
    slug: row.slug,
  });
  if (!href) return null;

  /*
   * A characterless radical resolves to its glyph before the slug is
   * considered: falling straight through printed the English word, so a kanji
   * page listed "tofu" among the parts of 脈.
   */
  const label =
    resolveSubjectGlyph({ subjectType: row.subjectType, characters: row.characters, slug: row.slug }) ||
    row.slug?.trim() ||
    "";
  if (!label) return null;

  return {
    subjectId: row.subjectId,
    subjectType: row.subjectType,
    label,
    meaning: row.meaning?.trim() || null,
    reading: row.reading?.trim() || null,
    level: row.level,
    ukLevel: row.subjectType === SUBJECT_TYPES.kanji ? (kanjiPlacement(label)?.level ?? null) : null,
    href,
  };
}

/** Easiest first, since a list of words is read as a place to start. */
function byLevelThenId(left: RelatedSubject, right: RelatedSubject): number {
  if (left.level !== right.level) return left.level - right.level;
  return left.subjectId - right.subjectId;
}

function collect(rows: RelatedRow[], exclude: Set<number>): RelatedSubject[] {
  const kept: RelatedSubject[] = [];
  const seen = new Set<number>();

  for (const row of rows) {
    if (exclude.has(row.subjectId) || seen.has(row.subjectId)) continue;
    const subject = toRelatedSubject(row);
    if (!subject) continue;
    seen.add(subject.subjectId);
    kept.push(subject);
  }

  return kept.sort(byLevelThenId).slice(0, RELATED_LIMIT);
}

/**
 * The groups a subject has, in reading order, with the empty ones dropped.
 *
 * What each group holds depends on what the subject is, because WaniKani's
 * links mean different things at each level: a radical's amalgamations are
 * kanji, a kanji's are words, and a word's components are the kanji it is
 * written with. The headings differ for the same reason - "used in" over words
 * and over kanji are the same relation seen from two heights.
 *
 * `sharesKanji` is the one that is not a WaniKani link at all: it is the words
 * built from this word's own kanji, gathered a step further out, so a word
 * page is a way into its neighbourhood rather than a dead end with two chips
 * on it.
 */
export function relatedGroupsFor({
  subjectId,
  subjectType,
  components,
  amalgamations,
  neighbours = [],
}: {
  subjectId: number;
  subjectType: string;
  /** What it is built from: radicals for a kanji, kanji for a word. */
  components: RelatedRow[];
  /** What is built from it: kanji for a radical, words for a kanji. */
  amalgamations: RelatedRow[];
  /** Words sharing this word's kanji; empty for anything else. */
  neighbours?: RelatedRow[];
}): RelatedGroup[] {
  const self = new Set([subjectId]);
  const groups: RelatedGroup[] = [];

  const builtFrom = collect(components, self);
  if (builtFrom.length > 0) groups.push({ id: RELATED_GROUPS.builtFrom, items: builtFrom });

  const usedIn = collect(amalgamations, self);
  if (usedIn.length > 0) groups.push({ id: RELATED_GROUPS.usedIn, items: usedIn });

  if (subjectType === SUBJECT_TYPES.vocabulary) {
    /* The word itself and the kanji it is made of are already above. */
    const exclude = new Set([subjectId, ...components.map((row) => row.subjectId)]);
    const shares = collect(neighbours, exclude);
    if (shares.length > 0) groups.push({ id: RELATED_GROUPS.sharesKanji, items: shares });
  }

  return groups;
}
