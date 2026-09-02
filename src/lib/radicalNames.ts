import "server-only";

import { getKanjiDictionaryEntry } from "./kanjiDictionary";
import { prisma } from "./prisma";
import { SUBJECT_TYPES } from "./domainConstants";

/**
 * A radical named in English rather than drawn.
 *
 * Somebody looking up a character they cannot read is often in the same
 * position with its parts: they can see the shape and have no way to type it.
 * The grid solves that by clicking, and a command that could only be written
 * in Japanese left the typed half of the feature useless to exactly the reader
 * it was built for.
 *
 * Two sources, best first, because neither covers the set on its own:
 *
 * - The kanji dictionary, for the 247 of 253 radicals that are also kanji. 口
 *   is mouth, 日 is sun, 木 is tree. This is the accurate answer and it costs
 *   nothing: the file is already shipped and already loaded.
 * - WaniKani's own radical names, for the 199 whose character is in this set,
 *   because a member who learned 車 as "car" and ハ as "fins" will type what
 *   they were taught. They are teaching mnemonics rather than the classical
 *   names - WaniKani calls 久 a raptor cage - so they answer second, never
 *   over the dictionary.
 *
 * A name that reaches neither answers with nothing. WaniKani draws some of its
 * radicals rather than writing them, so "beggar" names a picture and no
 * character in this set: better to find nothing than to guess a neighbour.
 */
export type RadicalNameIndex = Map<string, string>;

/** Cheap and stable, so the whole index is built once per process. */
let cached: Promise<RadicalNameIndex> | null = null;

function addName(index: RadicalNameIndex, name: string, radical: string): void {
  const key = name.trim().toLowerCase();
  if (key.length === 0 || index.has(key)) return;
  index.set(key, radical);
}

async function build(radicals: readonly string[]): Promise<RadicalNameIndex> {
  const index: RadicalNameIndex = new Map();
  const inSet = new Set(radicals);

  /* The dictionary first, so a classical name always wins its own character. */
  for (const radical of radicals) {
    for (const meaning of getKanjiDictionaryEntry(radical)?.meanings ?? []) {
      addName(index, meaning, radical);
    }
  }

  const wanikani = await prisma.wkSubjectCatalog
    .findMany({
      where: { subjectType: SUBJECT_TYPES.radical },
      select: { characters: true, meanings: true },
    })
    .catch(() => []);

  for (const row of wanikani) {
    const character = row.characters;
    if (!character || !inSet.has(character)) continue;
    /* The column is JSON, so it is a list of strings only by convention. */
    const meanings = Array.isArray(row.meanings) ? row.meanings : [];
    for (const meaning of meanings) {
      if (typeof meaning === "string") addName(index, meaning, character);
    }
  }

  return index;
}

export function radicalNameIndex(radicals: readonly string[]): Promise<RadicalNameIndex> {
  cached ??= build(radicals);
  return cached;
}

/**
 * The characters a run of names and characters means.
 *
 * A token already in the set is itself - somebody who typed 日 gets 日 - and
 * anything else is looked up. Order is kept, because the command reads back in
 * the order it was written.
 */
export async function resolveRadicalTokens(
  tokens: readonly string[],
  radicals: readonly string[],
): Promise<string[]> {
  const inSet = new Set(radicals);
  const unnamed = tokens.filter((token) => !inSet.has(token));
  const index = unnamed.length > 0 ? await radicalNameIndex(radicals) : null;

  const resolved: string[] = [];
  for (const token of tokens) {
    const radical = inSet.has(token) ? token : index?.get(token.trim().toLowerCase());
    if (radical && !resolved.includes(radical)) resolved.push(radical);
  }
  return resolved;
}
