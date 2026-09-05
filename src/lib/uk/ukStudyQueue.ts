import "server-only";

import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { prisma } from "@/lib/prisma";
import { getCatalogSubjectDetails } from "@/lib/subjectCatalogDetails";
import { srsScoringRules } from "@/lib/srs/srsScoringRules";
import { orderReviews, throttleAppliesTo } from "@/lib/srs/studyPreferences";
import { memberStudyPreferences } from "@/lib/srs/studyPreferencesServer";

/**
 * What a member has to do on the UmaKuma ladder right now.
 *
 * Two questions, and they are not the same one. **Lessons** are items at or
 * below their level that have no state row at all — nothing has been seen yet.
 * **Reviews** are items with a row whose `availableAt` has come round. An item
 * above their level is neither: it is locked, and it stays out of both counts
 * rather than showing as work they cannot do.
 *
 * Content is resolved rather than copied. Where WaniKani teaches the same
 * item, its meanings and readings come from `WkSubjectCatalog` at read time —
 * catalogue-first, because asking the API per request cost the JLPT explorer
 * 650ms before it drew anything. The 134 added jōyō kanji and the 253 RADKFILE
 * radicals have no WaniKani subject, so their facts sit on the row itself.
 */

export type UkStudyItem = {
  subjectId: number;
  key: string;
  kind: string;
  characters: string;
  level: number;
  meanings: string[];
  readings: string[];
  /** WaniKani's id where WaniKani teaches it; the credit line and the mirror both turn on this. */
  wkSubjectId: number | null;
  /** Null for a lesson, which has no state yet. */
  srsStage: number | null;
  /**
   * Whether this item has ever reached Guru - the latch.
   *
   * The level gate counts items that have *ever* passed, not items currently
   * at Guru, so a wrong answer drops the stage without un-learning the level.
   * This is that fact, made visible: a member seeing an item back at stage 2
   * with "Passed" beside it knows the level is safe, and knows why.
   */
  passed: boolean;
};

export type UkThrottle = {
  /** True while lessons are held back because reviews are outstanding. */
  held: boolean;
  /** Reviews due right now, which is what the threshold is measured against. */
  due: number;
  threshold: number;
};

export type UkStudyCounts = {
  lessons: number;
  /** Why lessons are zero, when they are zero because of the backlog. */
  throttle: UkThrottle;
  reviews: number;
  /** Due later today, so a member knows whether to wait. */
  upcoming: number;
};

/** The ladder rows a member may work on: everything at or below their level. */
async function unlockedSubjects(accountId: string) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { ukLevel: true },
  });
  const level = account?.ukLevel ?? 1;
  return prisma.ukSubject.findMany({
    where: { removedAt: null, level: { lte: level } },
    select: {
      id: true, key: true, kind: true, characters: true, level: true,
      meanings: true, readings: true, wkSubjectId: true,
    },
    orderBy: [{ level: "asc" }, { kind: "asc" }, { id: "asc" }],
  });
}

type LadderRow = Awaited<ReturnType<typeof unlockedSubjects>>[number];

/**
 * Fills in meanings and readings for the items WaniKani teaches, in one pass.
 *
 * Never their mnemonics: that is WaniKani's copyrighted text, and it is shown
 * only to members who have connected their own account.
 */
type ResolvedContent = { meanings: string[]; readings: string[]; characters: string };

async function withContent(rows: LadderRow[]): Promise<Map<number, ResolvedContent>> {
  const filled = new Map<number, ResolvedContent>();
  const wanted = rows.filter((row) => row.wkSubjectId !== null);
  if (wanted.length === 0) return filled;

  const details = await getCatalogSubjectDetails(wanted.map((row) => row.wkSubjectId as number)).catch(
    () => new Map(),
  );
  for (const row of wanted) {
    const detail = details.get(row.wkSubjectId as number);
    if (!detail) continue;
    filled.set(row.id, { meanings: detail.meanings, readings: detail.readings, characters: detail.characters });
  }
  return filled;
}

function toItem(
  row: LadderRow,
  content: Map<number, ResolvedContent>,
  srsStage: number | null,
  passed = false,
): UkStudyItem {
  const resolved = content.get(row.id);
  return {
    subjectId: row.id,
    key: row.key,
    kind: row.kind,
    /* The seed left every WaniKani-sourced word without its characters for a
       time; the catalogue has always known them. */
    characters: row.characters || resolved?.characters || "",
    wkSubjectId: row.wkSubjectId,
    level: row.level,
    /* The row's own facts win where it has them: those are the items
       WaniKani never taught, and the catalogue has nothing to say. */
    meanings: row.meanings.length > 0 ? row.meanings : (resolved?.meanings ?? []),
    readings: row.readings.length > 0 ? row.readings : (resolved?.readings ?? []),
    srsStage,
    passed,
  };
}

/** Items with no state row: never seen, and open. */
/**
 * Whether lessons are being held back by the review backlog.
 *
 * Anki does this by default - the review limit also caps new cards, so
 * introduction pauses while you are behind - and our balance simulator
 * measured what it is worth here: average backlog down 85% for 0.8% of
 * progress across twenty-four personas. It costs single-sitting learners
 * most, because they open behind more often.
 *
 * Off unless an admin has switched it on. The rules live in SiteSetting so
 * the threshold can be moved without a deploy.
 */
export async function ukLessonThrottle(accountId: string, now = new Date()): Promise<UkThrottle> {
  const [rules, preferences] = await Promise.all([srsScoringRules(), memberStudyPreferences(accountId)]);
  /* The site sets the default; the member may hold an opinion. Pace, not
     standard - the same freedom as choosing to study for twenty minutes
     instead of an hour. */
  if (!throttleAppliesTo(preferences, rules.throttleLessonsOnBacklog)) {
    return { held: false, due: 0, threshold: rules.backlogThreshold };
  }
  const due = await prisma.ukSrsState.count({
    where: { accountId, availableAt: { not: null, lte: now } },
  });
  return { held: due >= rules.backlogThreshold, due, threshold: rules.backlogThreshold };
}

export async function ukLessons(accountId: string, limit = 50): Promise<UkStudyItem[]> {
  const [rows, states, throttle] = await Promise.all([
    unlockedSubjects(accountId),
    prisma.ukSrsState.findMany({ where: { accountId }, select: { subjectId: true } }),
    ukLessonThrottle(accountId),
  ]);
  /* Held rather than hidden: the member is told why on the study page, so an
     empty lesson list never reads as "you have finished". */
  if (throttle.held) return [];
  const seen = new Set(states.map((state) => state.subjectId));
  /* Radicals first, then kanji, then words — the order a level is met, so a
     member is never asked for a character before its parts. */
  const order = [SUBJECT_TYPES.radical, SUBJECT_TYPES.kanji, SUBJECT_TYPES.vocabulary];
  const fresh = rows
    .filter((row) => !seen.has(row.id))
    .sort((a, b) => a.level - b.level || order.indexOf(a.kind) - order.indexOf(b.kind))
    .slice(0, limit);
  const content = await withContent(fresh);
  return fresh.map((row) => toItem(row, content, null));
}

/** Items whose next review has come round. */
export async function ukReviews(accountId: string, now = new Date(), limit = 100): Promise<UkStudyItem[]> {
  const preferences = await memberStudyPreferences(accountId);
  /* Ordered in the database by due date, then reordered to the member's
     choice. Taken before reordering so the limit still means "the most
     overdue hundred" whatever order they read them in - a shuffle that also
     chose *which* items to serve would be a different queue, not a different
     order. */
  const dueRows = await prisma.ukSrsState.findMany({
    where: { accountId, availableAt: { not: null, lte: now } },
    select: { subjectId: true, srsStage: true, passedAt: true, availableAt: true },
    orderBy: { availableAt: "asc" },
    take: limit,
  });
  const due = orderReviews(dueRows, preferences.reviewOrder);
  if (due.length === 0) return [];

  const rows = await prisma.ukSubject.findMany({
    where: { id: { in: due.map((state) => state.subjectId) } },
    select: {
      id: true, key: true, kind: true, characters: true, level: true,
      meanings: true, readings: true, wkSubjectId: true,
    },
  });
  const content = await withContent(rows);
  /* Walk `due`, not `rows`. The subjects come back in whatever order the
     database chose, so mapping over them would have thrown the member's
     chosen order away - the reorder above would have been dead code doing
     nothing, which is the worst kind of working. */
  const rowById = new Map(rows.map((row) => [row.id, row]));
  return due.flatMap((state) => {
    const row = rowById.get(state.subjectId);
    if (!row) return [];
    return [toItem(row, content, state.srsStage, state.passedAt !== null)];
  });
}

export async function ukStudyCounts(accountId: string, now = new Date()): Promise<UkStudyCounts> {
  const [rows, states, throttle] = await Promise.all([
    unlockedSubjects(accountId),
    prisma.ukSrsState.findMany({ where: { accountId }, select: { subjectId: true, availableAt: true } }),
    ukLessonThrottle(accountId, now),
  ]);
  const seen = new Set(states.map((state) => state.subjectId));
  const endOfDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return {
    lessons: throttle.held ? 0 : rows.filter((row) => !seen.has(row.id)).length,
    throttle,
    reviews: states.filter((state) => state.availableAt !== null && state.availableAt <= now).length,
    upcoming: states.filter(
      (state) => state.availableAt !== null && state.availableAt > now && state.availableAt <= endOfDay,
    ).length,
  };
}
