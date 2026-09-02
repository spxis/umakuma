import { LIST_ITEM_KINDS, isListItemKind, type ListItemKind } from "./domainConstants";

/**
 * What a saved list may be called and may contain.
 *
 * Split out of `studyLists.ts` because that file is `server-only` and these
 * rules are needed on both sides: the input that names a list has to cap at the
 * same length the route enforces, or a member types a name that is silently
 * truncated after they press save.
 */

export const STUDY_LIST_LIMITS = {
  /** Enough for "Week 37 - the ones he keeps missing" and not enough to hide a paragraph. */
  nameLength: 60,
  /** What one list holds. A grade is at most 200 kanji; a term's words run longer. */
  items: 500,
  /** Kept for the paste field, which still reads characters. */
  characters: 500,
  /** Per member, so a runaway client cannot fill the table. */
  perAccount: 100,
  noteLength: 200,
} as const;

/** One thing in a list, as the browser and the routes both speak of it. */
export type StudyListItemRef = {
  kind: ListItemKind;
  /** The characters for a kanji or a word, the slug for a radical, the id for a sentence. */
  key: string;
  /** WaniKani's id, where the catalogue names it. */
  subjectId?: number | null;
};

export type StudyListSummary = {
  id: string;
  name: string;
  items: StudyListItemRef[];
  updatedAt: string;
};

/** The same item, named the same way, however it arrived. */
export function listItemId(item: Pick<StudyListItemRef, "kind" | "key">): string {
  return `${item.kind}:${item.key}`;
}

/** CJK unified ideographs: what a lone character has to be to count as a kanji. */
const HAN = /^\p{Script=Han}$/u;

/**
 * What typed or pasted text is, as an item: one kanji is a kanji, anything
 * longer is a word. A paste of several kanji with nothing between them is
 * read as kanji one by one, which is what a kanji sheet from a handout is.
 */
export function itemsFromText(raw: string): StudyListItemRef[] {
  const tokens = raw.split(/[\s,、。・/|]+/).map((token) => token.trim()).filter(Boolean);
  const items: StudyListItemRef[] = [];
  for (const token of tokens) {
    const characters = [...token];
    if (characters.every((character) => HAN.test(character))) {
      for (const character of characters) items.push({ kind: LIST_ITEM_KINDS.kanji, key: character });
    } else {
      items.push({ kind: LIST_ITEM_KINDS.vocabulary, key: token });
    }
  }
  return normalizeListItems(items);
}

/**
 * A chosen subject as an item. A selection names its subjects by their
 * characters: one character is a kanji, more than one is a word. Unlike a
 * paste, a chosen word is never split into its kanji - somebody chose the
 * word.
 */
export function itemFromSelectionKey(key: string): StudyListItemRef {
  const trimmed = key.trim();
  return [...trimmed].length === 1 && HAN.test(trimmed)
    ? { kind: LIST_ITEM_KINDS.kanji, key: trimmed }
    : { kind: LIST_ITEM_KINDS.vocabulary, key: trimmed };
}

/** Deduplicated in order and capped - the shape the database should hold. */
export function normalizeListItems(raw: StudyListItemRef[]): StudyListItemRef[] {
  const seen = new Set<string>();
  const kept: StudyListItemRef[] = [];
  for (const item of raw) {
    const key = item.key.trim();
    if (!key || !isListItemKind(item.kind)) continue;
    const id = listItemId({ kind: item.kind, key });
    if (seen.has(id)) continue;
    seen.add(id);
    kept.push({ kind: item.kind, key, subjectId: item.subjectId ?? null });
    if (kept.length >= STUDY_LIST_LIMITS.items) break;
  }
  return kept;
}

/** The kanji in a list, in order: what a practice sheet can trace. */
export function listKanji(items: StudyListItemRef[]): string[] {
  return items.filter((item) => item.kind === LIST_ITEM_KINDS.kanji).map((item) => item.key);
}

/** How many of each kind a list holds, for the chips. */
export function countByKind(items: StudyListItemRef[]): Partial<Record<ListItemKind, number>> {
  const counts: Partial<Record<ListItemKind, number>> = {};
  for (const item of items) counts[item.kind] = (counts[item.kind] ?? 0) + 1;
  return counts;
}

/** Trimmed, deduplicated and capped - the shape the database should hold. */
export function normalizeListCharacters(raw: string[]): string[] {
  const seen = new Set<string>();
  for (const value of raw) {
    for (const character of Array.from(value)) {
      if (seen.size >= STUDY_LIST_LIMITS.characters) break;
      if (character.trim()) seen.add(character);
    }
  }
  return [...seen];
}

/**
 * A name as it will be stored, or null if there is nothing left of it.
 *
 * Inner whitespace is collapsed as well as trimmed, so "Week  1" and "Week 1"
 * are the same list rather than two. That matters more than it looks: the
 * unique key is the name, so a stray double space is how a member ends up with
 * two lists they cannot tell apart on the page.
 *
 * Capped by code point rather than by slicing the string, because a name may
 * hold kanji outside the Basic Multilingual Plane and cutting at 60 UTF-16
 * units can land in the middle of one.
 */
export function normalizeListName(raw: string): string | null {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (!collapsed) return null;
  return Array.from(collapsed).slice(0, STUDY_LIST_LIMITS.nameLength).join("");
}

/**
 * A missing table is survivable.
 *
 * This repo applies schema by hand, so code can reach production a moment
 * before the table does. Everywhere a list is only decoration - a count, a
 * menu of saved sheets - an empty answer is far better than a 500 that takes
 * the whole page down with it.
 */
export function isMissingStudyListTableError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "P2021" || code === "P2022";
}

/**
 * The name is already on another of this member's lists.
 *
 * `@@unique([accountId, name])` is what makes saving twice under one name an
 * update rather than a fork, and it is the same constraint a rename runs into.
 * Renaming has no sensible merge, so this becomes a 409 the member can act on
 * instead of a 500 they cannot.
 */
export function isDuplicateListNameError(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "P2002";
}
