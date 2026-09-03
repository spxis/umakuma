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

/**
 * The six radicals RADKFILE writes with a stand-in character.
 *
 * Its key for a shape that has no convenient kanji form is a katakana or a
 * fullwidth bar - ｜ is U+FF5C, the typographic vertical line, not 丨 the
 * radical - and both name sources are keyed on characters that are kanji. So
 * six of 253 came back with no name at all, and a reader on a kanji page saw
 * an empty box under a part of the character they were reading about.
 *
 * Written down rather than looked up, because there is nothing to look them
 * up by: the character in the data is a stand-in, and asking the dictionary
 * about a fullwidth bar is asking about punctuation. The names are the ones
 * the radicals are known by, not invented for the occasion.
 */
const STAND_IN_NAMES: Record<string, string> = {
  "｜": "line",
  "ノ": "slash",
  "ハ": "eight",
  "マ": "katakana ma",
  "ユ": "katakana yu",
  "ヨ": "snout",
};

/** WaniKani's radical names by character, which is input-independent and cacheable. */
let wanikaniNames: Promise<Map<string, string>> | null = null;

async function buildWanikaniNames(): Promise<Map<string, string>> {
  const rows = await prisma.wkSubjectCatalog
    .findMany({
      where: { subjectType: SUBJECT_TYPES.radical },
      select: { characters: true, meanings: true },
    })
    .catch(() => []);

  const names = new Map<string, string>();
  for (const row of rows) {
    if (!row.characters || names.has(row.characters)) continue;
    const meanings = Array.isArray(row.meanings) ? row.meanings : [];
    const first = meanings.find((meaning): meaning is string => typeof meaning === "string");
    if (first) names.set(row.characters, first);
  }
  return names;
}

/**
 * What each radical is called, for showing rather than for searching.
 *
 * The index above answers "what did they type"; this answers "what is this
 * called", which is the other direction and the one every surface that draws
 * a radical actually needs. The radicals grid asked the reverse index for a
 * radical and got nothing every time, so its cells had no title at all.
 *
 * Same order of preference as the index: the dictionary's classical name
 * first, our own for the six it cannot be asked about, and WaniKani's teaching
 * name last - it calls 久 a raptor cage, which is a fine mnemonic and a poor
 * label on a public page.
 */
export async function radicalDisplayNames(radicals: readonly string[]): Promise<Map<string, string>> {
  wanikaniNames ??= buildWanikaniNames();
  const wanikani = await wanikaniNames;

  const names = new Map<string, string>();
  for (const radical of radicals) {
    const name =
      getKanjiDictionaryEntry(radical)?.meanings?.[0] ?? STAND_IN_NAMES[radical] ?? wanikani.get(radical) ?? null;
    if (name) names.set(radical, name);
  }
  return names;
}

/** The same answer for one radical, where a caller has only one. */
export async function radicalDisplayName(radical: string): Promise<string | null> {
  return (await radicalDisplayNames([radical])).get(radical) ?? null;
}
