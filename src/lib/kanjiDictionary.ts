import "server-only";

import fs from "node:fs";
import path from "node:path";

import type {
  KanjiDictionaryAttribution,
  KanjiDictionaryEntry,
  KanjiDictionaryFile,
  KanjiDictionaryIndex,
} from "./kanjiDictionary.types";

/**
 * KANJIDIC2, the reference the site's three catalogues are footnotes to.
 *
 * WaniKani teaches what it teaches, the JLPT table has holes - no 鬱, no 苺 -
 * and the school grades stop at what schools cover. Between them a character
 * arrives with one meaning and a handful of readings, which is why "magnate"
 * found nothing for 王 until ranking learned to read past the first meaning.
 * This holds 10,384 characters with every meaning, every on and kun reading,
 * the name readings, stroke counts, grades and frequency ranks.
 *
 * Read the way the stroke data is read: the index says which file holds a
 * character, so a lookup opens one file of a few hundred kilobytes rather than
 * the whole 3.7MB, and what it opened stays cached for the next lookup.
 */

const DATA_DIR = path.join(process.cwd(), "src", "data", "kanjidic");

let cachedIndex: KanjiDictionaryIndex | null = null;
const cachedFiles = new Map<string, Map<string, KanjiDictionaryEntry>>();
let cachedAll: KanjiDictionaryEntry[] | null = null;

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8")) as T;
  } catch {
    return null;
  }
}

function loadIndex(): KanjiDictionaryIndex | null {
  cachedIndex ??= readJson<KanjiDictionaryIndex>("index.json");
  return cachedIndex;
}

function loadFile(file: string): Map<string, KanjiDictionaryEntry> {
  const cached = cachedFiles.get(file);
  if (cached) return cached;

  const parsed = readJson<KanjiDictionaryFile>(file);
  const byKanji = new Map((parsed?.kanji ?? []).map((entry) => [entry.kanji, entry]));
  cachedFiles.set(file, byKanji);
  return byKanji;
}

/** How much the dictionary holds, and which release it was built from. */
export function getKanjiDictionarySummary(): { totalCount: number; attribution: KanjiDictionaryAttribution } | null {
  const index = loadIndex();
  return index ? { totalCount: index.totalCount, attribution: index.attribution } : null;
}

/** Who the data belongs to and under what licence, for the credit it requires. */
export function getKanjiDictionaryAttribution(): KanjiDictionaryAttribution | null {
  return loadIndex()?.attribution ?? null;
}

/**
 * One character, from whichever file holds it.
 *
 * The index carries each file's characters as one string, so finding the right
 * file is a substring test over a few hundred bytes rather than a scan of the
 * data itself.
 */
export function getKanjiDictionaryEntry(character: string): KanjiDictionaryEntry | null {
  const index = loadIndex();
  if (!index || character.length === 0) return null;

  const holder = index.files.find((file) => file.characters.includes(character));
  if (!holder) return null;

  return loadFile(holder.file).get(character) ?? null;
}

/**
 * Every entry, for the callers that have to look at all of them.
 *
 * Searching means reading the lot, and at 10,384 entries that is one pass over
 * an array the process then keeps - the same bargain the school-grade catalogue
 * already makes, at three times the size.
 */
export function getAllKanjiDictionaryEntries(): KanjiDictionaryEntry[] {
  if (cachedAll) return cachedAll;

  const index = loadIndex();
  const entries: KanjiDictionaryEntry[] = [];
  for (const file of index?.files ?? []) {
    entries.push(...loadFile(file.file).values());
  }

  cachedAll = entries;
  return entries;
}

/**
 * A reading as a reader wants it, not as the file writes it.
 *
 * KANJIDIC2 marks okurigana with a dot and a prefix form with a hyphen, so 込
 * arrives as `-こ.む` and 行 as `おこな.う`. Both marks belong to the
 * dictionary's own grammar and neither belongs on a chip.
 */
export function readingWithoutMarks(reading: string): string {
  return reading.replace(/[.\-]/g, "");
}

/**
 * The one reading to print where there is room for one.
 *
 * On'yomi first, because a character is nearly always met inside a compound -
 * 士 and 土 are シ and ド long before anybody needs つち - then kun, then the
 * name readings for the callers that ask, since a place name is often the
 * third: 埼 reads さき only in names.
 *
 * Five surfaces wrote this expression out, two of them stripped the okurigana
 * dot afterwards and neither stripped the hyphen, so the stroke pages have
 * been drawing 込 as `-こ.む`.
 */
export function primaryKanjiReading(
  entry: KanjiDictionaryEntry | null | undefined,
  options?: { nanori?: boolean },
): string | null {
  const reading =
    entry?.readings.on[0] ??
    entry?.readings.kun[0] ??
    (options?.nanori ? entry?.readings.nanori[0] : undefined) ??
    null;
  return reading ? readingWithoutMarks(reading) : null;
}

/** Drops what is held, so a test can read the files again. */
export function clearKanjiDictionaryCache(): void {
  cachedIndex = null;
  cachedFiles.clear();
  cachedAll = null;
}
