import { fetchStudyTagRows } from "@/lib/studySubjectTags";
import { getSchoolGradeIndex } from "@/lib/schoolGrades";
import "server-only";

import { accountUrlKeyWhere } from "./accountLookup";
import { prisma } from "./prisma";
import { canViewList, listKanji } from "./studyListRules";
import { findListBySlug } from "./studyLists";
import { querySchoolGradeCatalog } from "./schoolGrades";
import { getStrokeOrder } from "./strokeOrder";
import { withOfficialReadings } from "./gradeReadings";

/* The source names live in a client-safe module; a link is built in the browser. */
export {
  PRACTICE_SOURCES,
  TAGGED_PRACTICE_SOURCES,
  isPracticeSource,
  isTaggedPracticeSource,
  practiceSourceHasLevels,
  practiceSourceHasSlug,
  type PracticeSource,
} from "./practiceSourceKinds";

import type { PracticeSource } from "./practiceSourceKinds";
import { PRACTICE_SOURCES, isTaggedPracticeSource } from "./practiceSourceKinds";

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

/**
 * A sheet built from the member's own list.
 *
 * Only kanji: a tagged list holds radicals and vocabulary too, and neither has
 * a stroke chart worth printing. The catalogue supplies the readings, since a
 * tag row is only an id and a flag.
 */
async function taggedEntries(
  source: PracticeSource,
  accountId: string | null,
  page: number,
  pageSize: number,
): Promise<{ entries: PracticeEntry[]; total: number }> {
  if (!accountId) {
    return { entries: [], total: 0 };
  }

  const rows = await fetchStudyTagRows(accountId);
  const wanted = rows.filter((row) => (source === PRACTICE_SOURCES.trouble ? row.trouble : row.favorite));
  if (wanted.length === 0) {
    return { entries: [], total: 0 };
  }

  const subjects = await prisma.wkSubjectCatalog.findMany({
    where: { wkSubjectId: { in: wanted.map((row) => row.subjectId) }, subjectType: "kanji" },
    select: { characters: true, meanings: true, readings: true },
    orderBy: { wkSubjectId: "asc" },
  });

  const candidates = subjects
    .filter((row): row is typeof row & { characters: string } => Boolean(row.characters))
    .map((row) => ({
      kanji: row.characters,
      meaning: firstMeaning(row.meanings),
      on: readingsOfType(row.readings, "onyomi"),
      kun: readingsOfType(row.readings, "kunyomi"),
    }));

  const entries = toEntries(candidates);
  return { entries: entries.slice((page - 1) * pageSize, page * pageSize), total: entries.length };
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
 * A sheet built from characters somebody picked by hand.
 *
 * The chosen order is kept rather than sorted: a member who picked this
 * week's ten characters in a particular order meant that order, and a sheet
 * that silently re-sorts them is a different sheet from the one they built.
 * The catalogue supplies the readings, and anything without stroke data drops
 * out the same way it does everywhere else.
 */
async function pickedEntries(
  picked: string[],
  page: number,
  pageSize: number,
): Promise<{ entries: PracticeEntry[]; total: number }> {
  if (picked.length === 0) {
    return { entries: [], total: 0 };
  }

  const rows = await prisma.wkSubjectCatalog.findMany({
    where: { characters: { in: picked }, subjectType: "kanji" },
    select: { characters: true, meanings: true, readings: true },
  });

  const byCharacter = new Map(rows.map((row) => [row.characters, row]));
  const candidates = picked.flatMap((kanji) => {
    const row = byCharacter.get(kanji);
    return row
      ? [{
          kanji,
          meaning: firstMeaning(row.meanings),
          on: readingsOfType(row.readings, "onyomi"),
          kun: readingsOfType(row.readings, "kunyomi"),
        }]
      : /* Not in the WaniKani catalogue - still traceable if KanjiVG has it. */
        [{ kanji, meaning: null, on: [], kun: [] }];
  });

  const entries = toEntries(candidates);
  return { entries: entries.slice((page - 1) * pageSize, page * pageSize), total: entries.length };
}

/**
 * Who is asking for a sheet, and which one.
 *
 * Grouped rather than added to the argument list because three of these only
 * ever apply to one source apiece, and a call site passing four nulls to reach
 * the fifth is a call site nobody can read.
 */
export type PracticeSheet = {
  entries: PracticeEntry[];
  total: number;
  /** What to title the sheet, for the one source that has a name of its own. */
  listName: string | null;
  /** The named list is not there, or not this reader's to read. */
  missing: boolean;
};

const MISSING_LIST: PracticeSheet = { entries: [], total: 0, listName: null, missing: true };

export type PracticeRequest = {
  /** Required by the tagged sources, which are one member's own lists. */
  accountId?: string | null;
  /** An admin reads a list the way they read every other private thing. */
  isAdmin?: boolean;
  /** The characters, when the source is a hand-picked set. */
  picked?: string[];
  /** The list's slug, when the source is a saved list. */
  slug?: string | null;
  /** Whose list it is, when it is not the reader's own. */
  owner?: string | null;
  /** The key an unlisted list's link carries. */
  key?: string | null;
};

/**
 * A sheet built from a saved list, whoever owns it.
 *
 * Only the kanji, in the order the list keeps them. The reader's own list
 * needs no owner; somebody else's names them in the path, and then the rule
 * the list's own page applies decides whether there is a sheet at all -
 * public to anyone, unlisted to whoever holds the key, private to nobody.
 *
 * That check belongs here rather than at the page. The page guards its own
 * address - only the member themselves or an admin opens somebody's practice
 * page - and while the only list it could reach was the page owner's, that
 * guard was the whole answer. An owner segment separates the two: the page is
 * at the reader's address and the list belongs to a third person, about whom
 * the guard on the address says nothing.
 *
 * A list that may not be read comes back `missing`, and the page turns that
 * into the same 404 the list's own page gives. Absent rather than forbidden,
 * for the reason it is there: a refusal confirms that the address names
 * something. It is also what a nonsense address gets - `/practice/list/x/y`
 * names a member nobody answers to - so a broken link does not render as a
 * working sheet with nothing on it.
 */
async function savedListEntries(
  request: PracticeRequest,
  slug: string,
  page: number,
  pageSize: number,
): Promise<PracticeSheet> {
  const readerAccountId = request.accountId ?? null;
  const ownerAccountId = request.owner
    ? (await prisma.account.findFirst({ where: accountUrlKeyWhere(request.owner), select: { id: true } }))?.id ?? null
    : readerAccountId;
  if (!ownerAccountId) return MISSING_LIST;

  const list = await findListBySlug(ownerAccountId, slug);
  if (!list) return MISSING_LIST;

  const allowed = canViewList({
    visibility: list.visibility,
    isOwner: ownerAccountId === readerAccountId,
    isAdmin: request.isAdmin ?? false,
    shareToken: list.shareToken,
    key: request.key ?? null,
  });
  if (!allowed) return MISSING_LIST;

  const { entries, total } = await pickedEntries(listKanji(list.items), page, pageSize);
  /* The name titles the sheet, and only a reader allowed the list gets it. */
  return { entries, total, listName: list.name, missing: false };
}

/**
 * The characters a practice sheet should hold, from whichever list was asked
 * for. Grades come from the local catalogue; the tagged lists are the
 * learner's own ladders and live in the database; a picked sheet is whatever
 * they chose by hand.
 */
export async function practiceEntriesFor(
  source: PracticeSource,
  level: number,
  page: number,
  pageSize: number,
  /** Who is asking, and which list or characters they asked for. */
  request: PracticeRequest = {},
): Promise<PracticeSheet> {
  const accountId = request.accountId ?? null;

  if (source === PRACTICE_SOURCES.picked) {
    return { ...(await pickedEntries(request.picked ?? [], page, pageSize)), listName: null, missing: false };
  }

  if (source === PRACTICE_SOURCES.list) {
    return savedListEntries(request, request.slug ?? "", page, pageSize);
  }

  if (isTaggedPracticeSource(source)) {
    return { ...(await taggedEntries(source, accountId, page, pageSize)), listName: null, missing: false };
  }

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
    return { entries: toEntries(candidates), total: catalog.pagination.totalItems, listName: null, missing: false };
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
    return { entries: toEntries(candidates), total, listName: null, missing: false };
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
  return { entries: toEntries(candidates), total, listName: null, missing: false };
}


/**
 * How many characters each level of a source holds.
 *
 * The first row of chips has carried counts for a while and the chooser has
 * not, so picking a grade meant choosing blind between eight numbers. One
 * query per source rather than one per chip: a `groupBy` is a single round
 * trip, where counting each level separately would be sixty for WaniKani.
 */
export async function practiceLevelCounts(source: PracticeSource): Promise<Record<number, number>> {
  if (source === PRACTICE_SOURCES.grade) {
    const index = getSchoolGradeIndex();
    return Object.fromEntries((index?.grades ?? []).map((entry) => [entry.grade, entry.totalCount ?? 0]));
  }

  if (source === PRACTICE_SOURCES.wanikani) {
    const rows = await prisma.wkSubjectCatalog.groupBy({
      by: ["level"],
      where: { subjectType: "kanji", hiddenAt: null },
      _count: { _all: true },
    });
    return Object.fromEntries(rows.map((row) => [row.level, row._count._all]));
  }

  if (source === PRACTICE_SOURCES.jlpt) {
    const rows = await prisma.jlptKanji.groupBy({ by: ["nLevel"], _count: { _all: true } });
    return Object.fromEntries(rows.map((row) => [row.nLevel, row._count._all]));
  }

  // The tagged lists have no levels to count.
  return {};
}
