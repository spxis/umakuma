import "server-only";

import { prisma } from "./prisma";
import { querySchoolGradeCatalog } from "./schoolGrades";
import { getStrokeOrder } from "./strokeOrder";
import { withOfficialReadings } from "./gradeReadings";

export const PRACTICE_SOURCES = { grade: "grade", wanikani: "wanikani", jlpt: "jlpt" } as const;

export type PracticeSource = (typeof PRACTICE_SOURCES)[keyof typeof PRACTICE_SOURCES];

export function isPracticeSource(value: string): value is PracticeSource {
  return Object.values(PRACTICE_SOURCES).includes(value as PracticeSource);
}

export type PracticeEntry = {
  kanji: string;
  meaning: string | null;
  /** On and kun, for the sheets that choose to print them. */
  on: string[];
  kun: string[];
  strokes: string[];
  strokeCount: number;
  viewBox: string;
};

type Candidate = {
  kanji: string;
  meaning: string | null;
  grade?: number;
  on?: string[];
  kun?: string[];
};

/**
 * Only characters with stroke data can be traced.
 *
 * A sheet of empty squares would be worse than a shorter sheet, so anything
 * without strokes is dropped rather than printed blank.
 */
function toEntries(candidates: Candidate[]): PracticeEntry[] {
  return candidates
    .map((candidate) => {
      const strokes = getStrokeOrder(candidate.kanji, candidate.grade);
      return strokes
        ? {
            kanji: candidate.kanji,
            meaning: candidate.meaning,
            on: candidate.on ?? [],
            kun: candidate.kun ?? [],
            strokes: strokes.strokes,
            strokeCount: strokes.strokeCount,
            viewBox: strokes.viewBox,
          }
        : null;
    })
    .filter((entry): entry is PracticeEntry => entry !== null);
}

/** WaniKani stores readings as objects tagged with their type. */
function readingsOfType(readings: unknown, type: "onyomi" | "kunyomi"): string[] {
  if (!Array.isArray(readings)) return [];
  return readings
    .filter((r): r is { type?: string; reading?: string } => Boolean(r) && typeof r === "object")
    .filter((r) => r.type === type && typeof r.reading === "string")
    .map((r) => r.reading as string);
}

function firstMeaning(meanings: unknown): string | null {
  if (!Array.isArray(meanings)) return null;
  const primary = meanings.find((item) => item && typeof item === "object" && (item as { primary?: boolean }).primary);
  const any = meanings.find((item) => item && typeof item === "object");
  const chosen = (primary ?? any) as { meaning?: string } | undefined;
  return chosen?.meaning ?? null;
}

/**
 * The characters a practice sheet should hold, from whichever list was asked
 * for. Grades come from the local catalogue; the other two are the learner's
 * own ladders and live in the database.
 */
export async function practiceEntriesFor(
  source: PracticeSource,
  level: number,
  page: number,
  pageSize: number,
): Promise<{ entries: PracticeEntry[]; total: number }> {
  if (source === PRACTICE_SOURCES.grade) {
    const catalog = querySchoolGradeCatalog({
      page,
      pageSize,
      grade: level,
      search: null,
      sortBy: "grade",
      sortDir: "asc",
    });
    const candidates = withOfficialReadings(catalog.items).map((item) => {
      const readings = item.gradeApprovedReadings ?? item.readings;
      return {
        kanji: item.kanji,
        meaning: item.primaryMeaning ?? null,
        grade: item.grade,
        on: readings?.on ?? [],
        kun: readings?.kun ?? [],
      };
    });
    return { entries: toEntries(candidates), total: catalog.pagination.totalItems };
  }

  if (source === PRACTICE_SOURCES.wanikani) {
    const where = { subjectType: "kanji", level, hiddenAt: null };
    const [rows, total] = await Promise.all([
      prisma.wkSubjectCatalog.findMany({
        where,
        select: { characters: true, meanings: true, readings: true },
        orderBy: { wkSubjectId: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.wkSubjectCatalog.count({ where }),
    ]);

    const candidates = rows
      .filter((row): row is typeof row & { characters: string } => Boolean(row.characters))
      .map((row) => ({
        kanji: row.characters,
        meaning: firstMeaning(row.meanings),
        on: readingsOfType(row.readings, "onyomi"),
        kun: readingsOfType(row.readings, "kunyomi"),
      }));
    return { entries: toEntries(candidates), total };
  }

  const where = { nLevel: level };
  const [rows, total] = await Promise.all([
    prisma.jlptKanji.findMany({
      where,
      select: { kanji: true, primaryMeaning: true, meanings: true, onReadings: true, kunReadings: true },
      orderBy: { kanji: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.jlptKanji.count({ where }),
  ]);

  const candidates = rows.map((row) => ({
    kanji: row.kanji,
    meaning: row.primaryMeaning ?? row.meanings[0] ?? null,
    on: row.onReadings ?? [],
    kun: row.kunReadings ?? [],
  }));
  return { entries: toEntries(candidates), total };
}
