import "server-only";

import { SUBJECT_TYPES } from "@/lib/domainConstants";
import type { RelatedReference } from "@/lib/glyphTypes";
import type { JlptMeta } from "@/lib/jlptTypes";
import { confusableWarnings, type ConfusableWarning } from "@/lib/kanjiConfusableWarning";
import { LEVEL_SYSTEMS } from "@/lib/levelBadge";
import { prisma } from "@/lib/prisma";
import { getCatalogSubjectDetails, toJlptMeta, type CatalogSubjectDetail } from "@/lib/subjectCatalogDetails";
import { srsScoringRules } from "@/lib/srs/srsScoringRules";
import { orderReviews, throttleAppliesTo } from "@/lib/srs/studyPreferences";
import { memberStudyPreferences } from "@/lib/srs/studyPreferencesServer";
import { LADDER_STREAMS, type LadderStreamValue } from "@/lib/ladder/ladderStreams";
import { ladderColumns, type LadderColumns } from "./ladderColumns";

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
  /** On the member's own ladder - and `stream` says which, so a chip can put it in the right slot. */
  level: number;
  stream: LadderStreamValue;
  meanings: string[];
  readings: string[];
  /** WaniKani's id where WaniKani teaches it; the credit line and the mirror both turn on this. */
  wkSubjectId: number | null;
  /**
   * Everything the WaniKani feed says about the same subject, so a member who
   * moved here keeps the review they had: their WaniKani level, the parts,
   * the words, the dictionary panel, the look-alike warning. Catalogue-first
   * like the readings; the N band and the panel come from the JLPT table for
   * the 134 kanji WaniKani never taught. `studyFeedParity.test.ts` is the
   * list of what is still missing.
   */
  wkLevel: number | null;
  radicals: RelatedReference[];
  componentKanji: RelatedReference[];
  usedInVocabulary: RelatedReference[];
  jlptLevel: number | null;
  jlptMeta: JlptMeta | null;
  confusables: ConfusableWarning[];
  /** The state's dates, for "first met" and "how long it has waited". Null for a lesson. */
  startedAt: Date | null;
  availableAt: Date | null;
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

/**
 * Which ladder a member follows, and so which level column is theirs.
 *
 * Every UG member was being taught in UN order before this: the queue read
 * `unLevel` and filtered on `level` for everyone, so the fourteen members who
 * chose the school-year path were served the JLPT ordering and never told.
 */
async function memberColumns(accountId: string) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { ladderStream: true, unLevel: true, ugLevel: true },
  });
  const columns = ladderColumns(account?.ladderStream ?? LADDER_STREAMS.un);
  return { columns, level: account?.[columns.accountLevel] ?? 1 };
}

/**
 * A subject row with `level` meaning the level on the member's own ladder.
 *
 * Both columns are fetched and the member's is the one every consumer reads,
 * so the sort, the display and the gate all agree on which ordering this is.
 */
export function onOwnLadder<T extends { level: number; ugLevel: number }>(row: T, columns: LadderColumns): T {
  return { ...row, level: row[columns.subjectLevel] };
}

/** The ladder rows a member may work on: everything at or below their level. */
/** Both level columns, always: `onOwnLadder` picks the member's after the read. */
const LADDER_ROW_SELECT = {
  id: true, key: true, kind: true, characters: true, level: true, ugLevel: true,
  meanings: true, readings: true, wkSubjectId: true, nLevel: true,
} as const;

async function unlockedSubjects(accountId: string) {
  const { columns, level } = await memberColumns(accountId);
  const member: Member = { stream: columns.stream, level };
  const rows = await prisma.ukSubject.findMany({
    where: { removedAt: null, [columns.subjectLevel]: { lte: level } },
    select: LADDER_ROW_SELECT,
    orderBy: [{ [columns.subjectLevel]: "asc" }, { kind: "asc" }, { id: "asc" }],
  });
  return { rows: rows.map((row) => onOwnLadder(row, columns)), columns, member };
}

type LadderRow = Awaited<ReturnType<typeof unlockedSubjects>>["rows"][number];

/**
 * Fills in meanings and readings for the items WaniKani teaches, in one pass.
 *
 * Never their mnemonics: that is WaniKani's copyrighted text, and it is shown
 * only to members who have connected their own account.
 */
type ResolvedContent = {
  meanings: string[];
  readings: string[];
  characters: string;
  /** The catalogue's whole entry, where WaniKani teaches the subject. */
  detail: CatalogSubjectDetail | null;
  /** The JLPT table's row, for a kanji the catalogue does not hold. */
  jlpt: { nLevel: number | null; meta: JlptMeta } | null;
};

async function withContent(rows: LadderRow[]): Promise<Map<number, ResolvedContent>> {
  const filled = new Map<number, ResolvedContent>();
  const wanted = rows.filter((row) => row.wkSubjectId !== null);
  const ours = rows.filter((row) => row.wkSubjectId === null && row.kind === SUBJECT_TYPES.kanji && row.characters);
  const [details, jlptRows] = await Promise.all([
    wanted.length > 0
      ? getCatalogSubjectDetails(wanted.map((row) => row.wkSubjectId as number)).catch(() => new Map<number, CatalogSubjectDetail>())
      : new Map<number, CatalogSubjectDetail>(),
    ours.length > 0
      ? prisma.jlptKanji.findMany({
          where: { kanji: { in: ours.map((row) => row.characters) } },
          select: {
            kanji: true, nLevel: true, primaryMeaning: true, meanings: true, onReadings: true, kunReadings: true,
            nanoriReadings: true, wordExamples: true, strokeCount: true, frequencyRank: true, schoolGrade: true, heisigKeyword: true,
          },
        }).catch(() => [])
      : [],
  ]);
  for (const row of wanted) {
    const detail = details.get(row.wkSubjectId as number);
    if (!detail) continue;
    filled.set(row.id, { meanings: detail.meanings, readings: detail.readings, characters: detail.characters, detail, jlpt: null });
  }
  const jlptByKanji = new Map(jlptRows.map((jlpt) => [jlpt.kanji, jlpt]));
  for (const row of ours) {
    const jlpt = jlptByKanji.get(row.characters);
    if (!jlpt) continue;
    filled.set(row.id, { meanings: [], readings: [], characters: row.characters, detail: null, jlpt: { nLevel: jlpt.nLevel, meta: toJlptMeta(jlpt) } });
  }
  return filled;
}

/** Whose sitting this is: the ladder and the standing the look-alike warning is judged against. */
type Member = { stream: LadderStreamValue; level: number };

/** A lesson has no state row; a review's dates come from its state. */
type StateDates = { srsStage: number | null; passed: boolean; startedAt: Date | null; availableAt: Date | null };
const NO_STATE: StateDates = { srsStage: null, passed: false, startedAt: null, availableAt: null };

function toItem(row: LadderRow, content: Map<number, ResolvedContent>, member: Member, state: StateDates): UkStudyItem {
  const resolved = content.get(row.id);
  const detail = resolved?.detail ?? null;
  const characters = row.characters || resolved?.characters || "";
  return {
    subjectId: row.id,
    key: row.key,
    kind: row.kind,
    /* The seed left every WaniKani-sourced word without its characters for a
       time; the catalogue has always known them. */
    characters,
    wkSubjectId: row.wkSubjectId,
    level: row.level,
    stream: member.stream,
    /* The row's own facts win where it has them: those are the items
       WaniKani never taught, and the catalogue has nothing to say. */
    meanings: row.meanings.length > 0 ? row.meanings : (resolved?.meanings ?? []),
    readings: row.readings.length > 0 ? row.readings : (resolved?.readings ?? []),
    wkLevel: detail?.wkLevel ?? null,
    radicals: detail?.radicals ?? [],
    componentKanji: detail?.componentKanji ?? [],
    usedInVocabulary: detail?.usedInVocabulary ?? [],
    jlptLevel: detail?.jlptLevel ?? resolved?.jlpt?.nLevel ?? row.nLevel ?? null,
    jlptMeta: detail?.jlptMeta ?? resolved?.jlpt?.meta ?? null,
    /* Judged on our ladder, against this member's standing on it. */
    confusables:
      row.kind === SUBJECT_TYPES.kanji && characters
        ? confusableWarnings(characters, member.level, LEVEL_SYSTEMS.umakuma, member.stream)
        : [],
    startedAt: state.startedAt,
    availableAt: state.availableAt,
    srsStage: state.srsStage,
    passed: state.passed,
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
  const [{ rows, member }, states, throttle] = await Promise.all([
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
  return fresh.map((row) => toItem(row, content, member, NO_STATE));
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
    select: { subjectId: true, srsStage: true, passedAt: true, availableAt: true, startedAt: true },
    orderBy: { availableAt: "asc" },
    take: limit,
  });
  const due = orderReviews(dueRows, preferences.reviewOrder);
  if (due.length === 0) return [];

  const [{ columns, level }, fetched] = await Promise.all([
    memberColumns(accountId),
    prisma.ukSubject.findMany({
      where: { id: { in: due.map((state) => state.subjectId) } },
      select: LADDER_ROW_SELECT,
    }),
  ]);
  const rows = fetched.map((row) => onOwnLadder(row, columns));
  const content = await withContent(rows);
  /* Walk `due`, not `rows`. The subjects come back in whatever order the
     database chose, so mapping over them would have thrown the member's
     chosen order away - the reorder above would have been dead code doing
     nothing, which is the worst kind of working. */
  const rowById = new Map(rows.map((row) => [row.id, row]));
  return due.flatMap((state) => {
    const row = rowById.get(state.subjectId);
    if (!row) return [];
    return [toItem(row, content, { stream: columns.stream, level }, { srsStage: state.srsStage, passed: state.passedAt !== null, startedAt: state.startedAt, availableAt: state.availableAt })];
  });
}

/** A review still ahead: the item, and when it falls due. */
export type UkUpcomingItem = UkStudyItem & { availableAt: Date };

/**
 * The next reviews to fall due, for the explorer's "coming up" strip.
 *
 * Read like the queue reads, because it was not: the route selected the
 * subject's `level` outright, which is the UN column, and the strip labelled
 * it with the member's own prefix - so a UG member read `UG12` over a number
 * from the exam ordering. It also drew a dash for the meaning of every item
 * WaniKani teaches, whose facts live in the catalogue, not on the row.
 */
export async function ukUpcoming(
  accountId: string,
  now = new Date(),
  limit = 8,
): Promise<{ items: UkUpcomingItem[]; totalUpcoming: number }> {
  const where = { accountId, availableAt: { gt: now }, burnedAt: null };
  const [{ columns, level }, totalUpcoming, states] = await Promise.all([
    memberColumns(accountId),
    prisma.ukSrsState.count({ where }),
    prisma.ukSrsState.findMany({
      where,
      select: { availableAt: true, srsStage: true, passedAt: true, startedAt: true, subject: { select: LADDER_ROW_SELECT } },
      orderBy: [{ availableAt: "asc" }, { id: "asc" }],
      take: limit,
    }),
  ]);
  const rows = states.map((state) => onOwnLadder(state.subject, columns));
  const content = await withContent(rows);
  const items = states.flatMap((state, index) => {
    const row = rows[index];
    if (!row || !state.availableAt) return [];
    return [{ ...toItem(row, content, { stream: columns.stream, level }, { srsStage: state.srsStage, passed: state.passedAt !== null, startedAt: state.startedAt, availableAt: state.availableAt }), availableAt: state.availableAt }];
  });
  return { items, totalUpcoming };
}

export async function ukStudyCounts(accountId: string, now = new Date()): Promise<UkStudyCounts> {
  const [{ rows }, states, throttle] = await Promise.all([
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
