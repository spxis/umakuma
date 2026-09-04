import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { SUBJECT_TYPES } from "./domainConstants";
import { prisma } from "./prisma";

/**
 * What a worksheet can say about a character besides how to draw it.
 *
 * A row on a practice sheet had the character, its meaning and its stroke
 * count, and the rest of the line was white paper. John: we have other
 * metadata a student benefits from when they look at kanji on the sheet - the
 * grade it belongs to, the group, whether it is part of JLPT N-something or
 * WaniKani level something.
 *
 * Three sources, none of them new: the school-grade table already ships, the
 * JLPT table already ships, and WaniKani's levels are in the catalogue the
 * site syncs. This only puts them behind one question, for one page's worth of
 * characters at a time.
 */
export type KanjiSheetFacts = {
  /** 1-6 where a Japanese child is taught it, or null past primary school. */
  schoolGrade: number | null;
  /** Which band it belongs to, short: ELEM, SEC, NAME. */
  band: string | null;
  /** The JLPT level that tests it, 1-5, where one does. */
  jlpt: number | null;
  /** WaniKani's level, 1-60, where WaniKani teaches it. */
  wkLevel: number | null;
};

type LevelRow = { schoolGrade?: number; category?: { abbr?: string } };
type JlptRow = { nLevel?: number };

const DATA = join(process.cwd(), "src", "data");

let schoolLevels: Record<string, LevelRow> | null = null;
let jlptLevels: Record<string, JlptRow> | null = null;

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(join(DATA, file), "utf8")) as T;
}

/** Both tables are a few hundred kilobytes and never change, so they are read once. */
function tables(): { school: Record<string, LevelRow>; jlpt: Record<string, JlptRow> } {
  schoolLevels ??= readJson<Record<string, LevelRow>>("kanjiLevels.json");
  jlptLevels ??= readJson<Record<string, JlptRow>>("jlptReadings.json");
  return { school: schoolLevels, jlpt: jlptLevels };
}

/**
 * The three facts for a page of characters.
 *
 * One query for the WaniKani levels rather than one per character: a sheet
 * holds at most twenty-six, and asking twenty-six times for a line of small
 * print is not a trade worth making.
 */
export async function kanjiSheetFacts(kanji: readonly string[]): Promise<Map<string, KanjiSheetFacts>> {
  const { school, jlpt } = tables();

  const wanikani = new Map<string, number>();
  if (kanji.length > 0) {
    const rows = await prisma.wkSubjectCatalog
      .findMany({
        where: { subjectType: SUBJECT_TYPES.kanji, characters: { in: [...kanji] } },
        select: { characters: true, level: true },
      })
      .catch(() => []);
    for (const row of rows) {
      if (row.characters && typeof row.level === "number") wanikani.set(row.characters, row.level);
    }
  }

  const facts = new Map<string, KanjiSheetFacts>();
  for (const character of kanji) {
    const grade = school[character]?.schoolGrade ?? null;
    facts.set(character, {
      /* 8 and 9 are the secondary and name bands rather than school years. */
      schoolGrade: grade !== null && grade >= 1 && grade <= 6 ? grade : null,
      band: school[character]?.category?.abbr ?? null,
      jlpt: jlpt[character]?.nLevel ?? null,
      wkLevel: wanikani.get(character) ?? null,
    });
  }
  return facts;
}
