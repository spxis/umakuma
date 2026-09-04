import "server-only";

import type { GameCategory } from "@/lib/gameMode";
import type { GameCatalogItem } from "@/lib/gameQuestionBuilder";
import { isSubjectType, SUBJECT_TYPES } from "@/lib/domainConstants";
import { toUkGameSubjectId } from "@/lib/ladder/ukSubjectIds";
import { prisma } from "@/lib/prisma";
import { getCatalogSubjectDetails } from "@/lib/subjectCatalogDetails";

/**
 * The UmaKuma curriculum as a game pool.
 *
 * The games were built to draw from WaniKani's catalogue and a member's own
 * assignments, which meant the hundred levels this site teaches could be
 * browsed and studied but never played. This is the third pool.
 *
 * Items keep the reserved id (`UK_SUBJECT_ID_BASE + row id`) everywhere
 * outside their own table, the same trick the map's prefectures use, so runs,
 * questions, answers, scoring and the scoreboard need no curriculum-specific
 * path — and a question resolves back correctly from its id alone, without the
 * run having to record which ladder it came from.
 */

/** WaniKani's content where they teach it; ours where they do not. */
async function contentFor(
  rows: { id: number; wkSubjectId: number | null; meanings: string[]; readings: string[] }[],
): Promise<Map<number, { meanings: string[]; readings: string[] }>> {
  const filled = new Map<number, { meanings: string[]; readings: string[] }>();
  const wanted = rows.filter((row) => row.wkSubjectId !== null && row.meanings.length === 0);
  if (wanted.length === 0) return filled;
  const details = await getCatalogSubjectDetails(wanted.map((row) => row.wkSubjectId as number)).catch(
    () => new Map(),
  );
  for (const row of wanted) {
    const detail = details.get(row.wkSubjectId as number);
    if (detail) filled.set(row.id, { meanings: detail.meanings, readings: detail.readings });
  }
  return filled;
}

/**
 * Everything the curriculum teaches up to a level, playable.
 *
 * A member's own SRS stage rides along where they have one, so the games'
 * existing difficulty and streak handling work unchanged; an item they have
 * never met counts as stage 0, which is what an unconnected WaniKani pool
 * already does.
 *
 * Items with no meaning at all are dropped rather than shown: a tile whose
 * answer is blank cannot be answered, and the 15 characterless radicals are
 * exactly that case.
 */
export async function loadUmakumaGamePool({
  accountId,
  level,
  category,
  maxLevel,
}: {
  accountId: string | null;
  level: number | null;
  category: GameCategory;
  maxLevel: number;
}): Promise<GameCatalogItem[]> {
  const kinds =
    category === SUBJECT_TYPES.kanji || category === SUBJECT_TYPES.vocabulary || category === SUBJECT_TYPES.radical
      ? [category]
      : [SUBJECT_TYPES.radical, SUBJECT_TYPES.kanji, SUBJECT_TYPES.vocabulary];

  const rows = await prisma.ukSubject.findMany({
    where: {
      removedAt: null,
      kind: { in: kinds as never },
      ...(level === null ? { level: { lte: maxLevel } } : { level }),
    },
    select: {
      id: true, kind: true, characters: true, level: true,
      meanings: true, readings: true, wkSubjectId: true,
    },
    orderBy: { id: "asc" },
  });

  const [content, states] = await Promise.all([
    contentFor(rows),
    accountId
      ? prisma.ukSrsState.findMany({
          where: { accountId },
          select: { subjectId: true, srsStage: true, startedAt: true },
        })
      : Promise.resolve([]),
  ]);
  const stateBySubject = new Map(states.map((state) => [state.subjectId, state]));

  return rows.flatMap((row) => {
    if (!isSubjectType(row.kind)) return [];
    const resolved = content.get(row.id);
    const meanings = row.meanings.length > 0 ? row.meanings : (resolved?.meanings ?? []);
    const readings = row.readings.length > 0 ? row.readings : (resolved?.readings ?? []);
    if (meanings.length === 0 || !row.characters.trim()) return [];

    const state = stateBySubject.get(row.id);
    return [
      {
        subjectId: toUkGameSubjectId(row.id),
        subjectType: row.kind,
        level: row.level,
        characters: row.characters,
        primaryMeaning: meanings[0] ?? null,
        primaryReading: readings[0] ?? null,
        /* The games key streaks and difficulty off an assignment; the
           curriculum has no assignment table, so the row id stands in. It is
           unique per member per item, which is all the games ask of it. */
        assignmentId: toUkGameSubjectId(row.id),
        srsStage: state?.srsStage ?? 0,
        startedAt: (state?.startedAt ?? new Date(0)).toISOString(),
        readings,
        componentSubjectIds: [],
        visuallySimilarSubjectIds: [],
      } satisfies GameCatalogItem,
    ];
  });
}

/** Resolves reserved curriculum ids back to options, for `hydrateGameQuestions`. */
export async function ukGameOptions(subjectIds: number[]): Promise<Map<number, GameCatalogItem>> {
  const wanted = subjectIds.map((id) => id - 10_000_000).filter((id) => id > 0);
  if (wanted.length === 0) return new Map();
  const rows = await prisma.ukSubject.findMany({
    where: { id: { in: wanted } },
    select: {
      id: true, kind: true, characters: true, level: true,
      meanings: true, readings: true, wkSubjectId: true,
    },
  });
  const content = await contentFor(rows);
  const options = new Map<number, GameCatalogItem>();
  for (const row of rows) {
    if (!isSubjectType(row.kind)) continue;
    const resolved = content.get(row.id);
    const meanings = row.meanings.length > 0 ? row.meanings : (resolved?.meanings ?? []);
    const readings = row.readings.length > 0 ? row.readings : (resolved?.readings ?? []);
    options.set(toUkGameSubjectId(row.id), {
      subjectId: toUkGameSubjectId(row.id),
      subjectType: row.kind,
      level: row.level,
      characters: row.characters,
      primaryMeaning: meanings[0] ?? null,
      primaryReading: readings[0] ?? null,
      assignmentId: toUkGameSubjectId(row.id),
      srsStage: 0,
      startedAt: new Date(0).toISOString(),
      readings,
      componentSubjectIds: [],
      visuallySimilarSubjectIds: [],
    });
  }
  return options;
}
