import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { buildLadderSeedPlan, type LadderSeedInput, type UkSubjectPlanRow } from "../src/lib/ladder/ladderSeedPlan";

/**
 * Reads the committed files and builds the plan both scripts work from.
 *
 * Files only, no database: the plan is what the curriculum *should* be, and
 * that answer must not depend on what any environment currently holds.
 */

const DATA = join(process.cwd(), "src/data");

function readJson<T>(relative: string): T {
  return JSON.parse(readFileSync(join(DATA, relative), "utf8")) as T;
}

type LadderFile = {
  levels: number;
  totalKanji: number;
  kanjiLevel: Record<string, { level: number; waniKaniLevel: number | null; nLevel: number | null }>;
  radicalLevel: Record<string, number>;
  vocabularyLevel: Record<string, number>;
};

type DictionaryEntry = {
  kanji: string;
  grade: number | null;
  meanings: string[];
  readings: { on: string[]; kun: string[] };
};

function loadDictionary(): LadderSeedInput["dictionary"] {
  const dictionary = new Map<string, { meanings: string[]; onReadings: string[]; kunReadings: string[]; grade: number | null }>();
  for (const file of readdirSync(join(DATA, "kanjidic"))) {
    if (file === "index.json") continue;
    for (const entry of readJson<{ kanji: DictionaryEntry[] }>(join("kanjidic", file)).kanji) {
      dictionary.set(entry.kanji, {
        meanings: entry.meanings ?? [],
        onReadings: entry.readings?.on ?? [],
        kunReadings: entry.readings?.kun ?? [],
        grade: entry.grade ?? null,
      });
    }
  }
  return dictionary;
}

/** WaniKani's kanji subject ids, so a curriculum row can point at its catalogue entry. */
function loadKanjiSubjectIds(): Map<string, number> {
  const index = readJson<{ files: string[] }>("wk-catalog-levels/index.json");
  const ids = new Map<string, number>();
  for (const file of index.files) {
    const level = readJson<{ kanji?: { characters: string | null; wkSubjectId: number; hiddenAt: string | null }[] }>(
      join("wk-catalog-levels", file),
    );
    for (const subject of level.kanji ?? []) {
      if (subject.characters && !subject.hiddenAt) ids.set(subject.characters, subject.wkSubjectId);
    }
  }
  return ids;
}

/**
 * WaniKani's *radical* subject ids, kept apart from their kanji ids.
 *
 * They teach 七 twice, once as a radical and once as a kanji, under different
 * ids. Linking one of our radicals to their kanji id would let somebody who
 * learned the shape be credited with the character, which is not the same
 * thing - so the two maps stay separate and a radical only ever pairs with a
 * radical.
 */
function loadRadicalSubjectIds(): Map<string, number> {
  const index = readJson<{ files: string[] }>("wk-catalog-levels/index.json");
  const ids = new Map<string, number>();
  for (const file of index.files) {
    const level = readJson<{ radicals?: { characters: string | null; wkSubjectId: number; hiddenAt: string | null }[] }>(
      join("wk-catalog-levels", file),
    );
    for (const subject of level.radicals ?? []) {
      /* The ones WaniKani draws rather than writes have no character at all,
         and there is nothing to pair them with. */
      if (subject.characters && !subject.hiddenAt) ids.set(subject.characters, subject.wkSubjectId);
    }
  }
  return ids;
}

export function ladderSeedPlan(): { rows: UkSubjectPlanRow[]; ladder: LadderFile } {
  const ladder = readJson<LadderFile>("kanjiLadder.json");
  return {
    ladder,
    rows: buildLadderSeedPlan({
      kanji: ladder.kanjiLevel,
      radicals: ladder.radicalLevel,
      vocabulary: ladder.vocabularyLevel,
      dictionary: loadDictionary(),
      kanjiSubjectIds: loadKanjiSubjectIds(),
      radicalSubjectIds: loadRadicalSubjectIds(),
    }),
  };
}
