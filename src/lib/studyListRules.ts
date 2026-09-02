import { LIST_ITEM_KINDS, LIST_VISIBILITIES, isListItemKind, type ListItemKind, type ListVisibility } from "./domainConstants";
import type { ListContributions } from "./listContributions";

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
  /** The name as the address says it; see `listSlug`. */
  slug: string;
  description: string | null;
  visibility: ListVisibility;
  contributions: ListContributions;
  archivedAt: string | null;
  items: StudyListItemRef[];
  createdAt: string;
  updatedAt: string;
  copyCount: number;
  shareCount: number;
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
 * Displayable, because a list's name is its address and its heading: letters
 * in any script, digits, spaces and the punctuation a title uses. Control
 * characters, emoji and symbols are dropped rather than refused, so a name
 * pasted with a stray mark still saves as the words it meant.
 *
 * Inner whitespace is collapsed as well as trimmed, so "Week  1" and "Week 1"
 * are the same list rather than two. Capped by code point rather than by
 * slicing the string, because a name may hold kanji outside the Basic
 * Multilingual Plane and cutting at 60 UTF-16 units can land in the middle
 * of one.
 */
const NAME_CHARACTER = /^[\p{L}\p{N}\p{M} \-–—・·&'().,!?:+/#]$/u;

export function normalizeListName(raw: string): string | null {
  const kept = Array.from(raw)
    .map((character) => (/\s/u.test(character) ? " " : character))
    .filter((character) => NAME_CHARACTER.test(character))
    .join("");
  const collapsed = kept.replace(/ +/g, " ").trim();
  if (!collapsed) return null;
  return Array.from(collapsed).slice(0, STUDY_LIST_LIMITS.nameLength).join("").trim() || null;
}

/**
 * The name as an address: `Week 1` is `week-1`, a Japanese name stays itself.
 *
 * Lowercased, spaces and punctuation to hyphens, letters in any script kept -
 * a Japanese name reads better in the address than a string of hex would. The
 * slug is derived, never stored: two names that make one slug are refused at
 * save time, so a list is always found by comparing slugs over the member's
 * own names.
 */
export function listSlug(name: string): string {
  return Array.from(name.toLowerCase())
    .map((character) => (/[\p{L}\p{N}]/u.test(character) ? character : "-"))
    .join("")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * The built-in lists' own addresses.
 *
 * Trouble, Favourites and Burned are lists in every sense a member cares
 * about, so they are read at an address like any other rather than in a panel
 * that opens from a button. The slug is the Canadian spelling a member reads;
 * the tag behind it keeps the stored spelling, which is not copy.
 */
export const TAG_LIST_SLUGS = {
  trouble: "trouble",
  favourites: "favorite",
  burned: "burned",
} as const;

export type TagListSlug = keyof typeof TAG_LIST_SLUGS;

export function tagForListSlug(slug: string): (typeof TAG_LIST_SLUGS)[TagListSlug] | null {
  const wanted = slug.trim().toLowerCase() as TagListSlug;
  return wanted in TAG_LIST_SLUGS ? TAG_LIST_SLUGS[wanted] : null;
}

export function slugForListTag(tag: (typeof TAG_LIST_SLUGS)[TagListSlug]): TagListSlug {
  const found = (Object.keys(TAG_LIST_SLUGS) as TagListSlug[]).find((slug) => TAG_LIST_SLUGS[slug] === tag);
  return found ?? "trouble";
}

/** A built-in list's page. */
export function tagListHref(owner: string, tag: (typeof TAG_LIST_SLUGS)[TagListSlug]): string {
  return `/users/${encodeURIComponent(owner)}/lists/${slugForListTag(tag)}`;
}

/** The list's own page. */
export function listHref(owner: string, name: string): string {
  return `/users/${encodeURIComponent(owner)}/lists/${encodeURIComponent(listSlug(name))}`;
}

/** The query parameter an unlisted link carries. */
export const LIST_KEY_PARAM = "key";

/** The link to hand to somebody: the page, with the key when the list needs one. */
export function listShareHref(owner: string, name: string, visibility: ListVisibility, shareToken: string | null): string {
  const base = listHref(owner, name);
  return visibility === LIST_VISIBILITIES.unlisted && shareToken ? `${base}?${LIST_KEY_PARAM}=${shareToken}` : base;
}

/**
 * Who may open a list.
 *
 * The owner and an admin always. A public list, anyone. An unlisted list,
 * anyone holding the key from its link. A private list, nobody else - and a
 * member who may see the owner's other pages is not an exception, since
 * private is what the owner chose over the two ways of sharing.
 */
export function canViewList(input: {
  visibility: ListVisibility;
  isOwner: boolean;
  isAdmin: boolean;
  shareToken: string | null;
  key: string | null;
}): boolean {
  if (input.isOwner || input.isAdmin) return true;
  if (input.visibility === LIST_VISIBILITIES.public) return true;
  if (input.visibility === LIST_VISIBILITIES.unlisted) return Boolean(input.shareToken) && input.key === input.shareToken;
  return false;
}

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
