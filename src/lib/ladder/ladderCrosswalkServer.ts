import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import ladderData from "@/data/kanjiLadder.json";
import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { getAllKanjiDictionaryEntries } from "@/lib/kanjiDictionary";
import { prisma } from "@/lib/prisma";

import { buildLadderCrosswalk, type LadderRow } from "./ladderCrosswalk";
import { summarizeLadderLevels, type LadderLevelSummary } from "./ladderQuery";

/**
 * The crosswalk, built once and held.
 *
 * Nine thousand rows over a 2,235-entry dictionary and one query for WaniKani's
 * words: expensive enough that rebuilding it per keystroke in the admin filter
 * would be felt, and stable enough that it only changes when a script runs. Ten
 * minutes, the same window the source reports use, and a clear for after an
 * import.
 */

const TTL_MS = 10 * 60_000;

/**
 * The ranks are read off disk rather than imported, for the reason
 * `wordFrequency.ts` gives: they are several hundred kilobytes, and a static
 * import would put them in the bundle of every route that reaches this file.
 */
function loadWordRanks(): Record<string, number> {
  try {
    const parsed = JSON.parse(readFileSync(join(process.cwd(), "src/data/wordFrequency.json"), "utf8"));
    return (parsed.rank ?? {}) as Record<string, number>;
  } catch {
    return {};
  }
}

type Held = { rows: LadderRow[]; levels: LadderLevelSummary[]; builtAtMs: number };

let held: Held | null = null;

async function loadWords(): Promise<Map<number, { characters: string; primaryMeaning: string | null; wkLevel: number }>> {
  const ids = Object.keys(ladderData.vocabularyLevel).map(Number);
  const rows = await prisma.wkSubjectCatalog
    .findMany({
      where: { wkSubjectId: { in: ids }, subjectType: SUBJECT_TYPES.vocabulary },
      select: { wkSubjectId: true, characters: true, level: true, meanings: true },
    })
    .catch(() => []);

  const words = new Map<number, { characters: string; primaryMeaning: string | null; wkLevel: number }>();
  for (const row of rows) {
    if (!row.characters) continue;
    const meanings = Array.isArray(row.meanings) ? (row.meanings as { meaning?: string; primary?: boolean }[]) : [];
    words.set(row.wkSubjectId, {
      characters: row.characters,
      primaryMeaning: meanings.find((entry) => entry.primary)?.meaning ?? null,
      wkLevel: row.level,
    });
  }
  return words;
}

async function build(): Promise<Held> {
  const dictionary = new Map(
    getAllKanjiDictionaryEntries().map((entry) => [
      entry.kanji,
      /* `meanings` too: a radical is named from the whole list, not the first. */
      { primaryMeaning: entry.primaryMeaning, meanings: entry.meanings, schoolGrade: entry.grade, frequencyRank: entry.frequencyRank },
    ]),
  );

  const rows = buildLadderCrosswalk({
    kanji: ladderData.kanjiLevel,
    radicals: ladderData.radicalLevel,
    vocabulary: ladderData.vocabularyLevel,
    dictionary,
    words: await loadWords(),
    wordRank: loadWordRanks(),
  });

  return { rows, levels: summarizeLadderLevels(rows, ladderData.levels), builtAtMs: Date.now() };
}

export async function loadLadderCrosswalk(): Promise<Held> {
  if (held && Date.now() - held.builtAtMs <= TTL_MS) return held;
  held = await build();
  return held;
}

/** Forgets the built rows, for after a catalogue sync or a ladder rebuild. */
export function clearLadderCrosswalkCache(): void {
  held = null;
}
