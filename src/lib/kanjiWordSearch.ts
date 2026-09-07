import "server-only";

import { Prisma } from "@prisma/client";

import { parseJlptWordExamples } from "@/lib/jlptWordExamples";
import type { JlptWordExample } from "@/lib/jlptTypes";
import { prisma } from "@/lib/prisma";

/**
 * The words a character is written in, found from the other end.
 *
 * A word belongs to every kanji in it. 七竃 is a word 七 is used in and a word
 * 竃 is used in, and the page only knew the first: the examples are stored on
 * `JlptKanji.wordExamples`, a row per JLPT character, so a character the exam
 * table has never heard of has no row and showed no words at all - while a
 * dozen stored words were spelled with it.
 *
 * John, on 竃 after arriving from 七: "it doesn't have any Used In Words
 * entries like the page we came from! That's wrong!!! If you came from one
 * vocabulary word, then that other word will have the same vocabulary!!! to
 * go in reverse."
 *
 * **Only when the page has room.** The scan is a `LIKE` over ten megabytes of
 * stored JSON - measured at about 250ms against production - and a page that
 * already has its twelve examples has nothing to gain from it. So a character
 * with a full row never pays, and 竃, which had nothing, pays once. That is
 * also why the query takes a row limit: for a common character Postgres stops
 * as soon as it has enough, and for a rare one there is little to find.
 *
 * Kept per process after the first look, the way the dictionary files are:
 * these rows are enrichment output and change on a seed, not on a request.
 */
const cache = new Map<string, JlptWordExample[]>();

/** Rows to read, not words: one row usually carries several usable words. */
const ROW_LIMIT = 40;

export async function wordsContaining(character: string, want: number): Promise<JlptWordExample[]> {
  if ([...character].length !== 1 || want <= 0) return [];

  const held = cache.get(character);
  if (held) return held.slice(0, want);

  const rows = await prisma.$queryRaw<{ wordExamples: unknown }[]>(Prisma.sql`
    SELECT "wordExamples" FROM "JlptKanji"
    WHERE "wordExamples"::text LIKE ${`%${character}%`}
    LIMIT ${ROW_LIMIT}
  `);

  const found = wordsSpelledWith(rows.map((row) => row.wordExamples), character);
  cache.set(character, found);
  return found.slice(0, want);
}

/**
 * The words in these stored blobs that are actually spelled with the character.
 *
 * The `LIKE` matches the whole blob, so a row is a candidate rather than an
 * answer: the character may have turned up in a chip's meaning, in a reading,
 * or in a different word in the same row. The spelling of each word decides,
 * which is the same rule `wordKanjiChips` follows one level down.
 *
 * Pure, and separate from the query, so the rule can be tested without a
 * database - the deduplication included, since 七竃 is stored under 七 and
 * under 嶺 and must arrive once.
 */
export function wordsSpelledWith(blobs: readonly unknown[], character: string): JlptWordExample[] {
  const seen = new Set<string>();
  const found: JlptWordExample[] = [];

  for (const blob of blobs) {
    for (const example of parseJlptWordExamples(blob)) {
      if (!example.written.includes(character)) continue;
      const key = `${example.written}-${example.pronounced}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(example);
    }
  }

  return found;
}

/**
 * The page's words: its own first, then the ones found from the other end.
 *
 * Its own row is what the exam table chose to teach with this character, so
 * those lead; the reverse ones fill what is left of the twelve. A word found
 * both ways appears once, under the row that stored it.
 */
export function mergeWordExamples(
  own: readonly JlptWordExample[],
  reverse: readonly JlptWordExample[],
  limit: number,
): JlptWordExample[] {
  const seen = new Set(own.map((example) => `${example.written}-${example.pronounced}`));
  const merged = [...own];

  for (const example of reverse) {
    if (merged.length >= limit) break;
    const key = `${example.written}-${example.pronounced}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(example);
  }

  return merged;
}

/** Drops what is held, so a test can read the rows again. */
export function clearWordSearchCache(): void {
  cache.clear();
}
