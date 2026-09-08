import "server-only";

import type { ReviewResult } from "@/lib/domainConstants";
import { LADDER_STREAMS, type LadderStreamValue } from "@/lib/ladder/ladderStreams";
import { prisma } from "@/lib/prisma";
import { srsGroupingFromStage } from "@/lib/srs/srsSchedule";
import { getCatalogSubjectDetails, type CatalogSubjectDetail } from "@/lib/subjectCatalogDetails";
import type { StudyHistoryRow } from "@/lib/studyHistoryView";

import { ukSubjectTypeFor } from "./ukExplorerFeed";
import { ukSubjectIdentity } from "./ukSubjectIdentity";

/**
 * A member's answers on our own ladder, as History draws them.
 *
 * History read `StudyReviewAttempt` and nothing else, which is the WaniKani
 * record: an answer given on UmaKuma's ladder is a `UkReviewAttempt`, joined
 * to the SRS state it moved and through that to the subject. So a member who
 * studied here all week opened History and found the page empty - or, for a
 * connected member, found their WaniKani reviews and none of ours.
 *
 * The level is the one the answer was given on. Every attempt is stamped
 * with the stream the member was following when they answered, and that is
 * what fills `unLevel` or `ugLevel` - not the member's stream today, which
 * may have changed since. A row from a UN week stays a UN row.
 *
 * Content is catalogue-first, the way the queue reads it: the 8,896 subjects
 * WaniKani teaches carry no meanings or readings of their own, and the row
 * drew a dash for every one of them until the catalogue was asked. Their
 * mnemonics stay out, as they do on the queue - that is WaniKani's text.
 */
export type UkHistoryAttempt = {
  id: string;
  accountId: string;
  stateId: number;
  subjectId: number;
  result: string;
  newSrsStage: number | null;
  submittedAt: Date;
  curriculumStream: LadderStreamValue | null;
  state: {
    srsStage: number;
    startedAt: Date | null;
    passedAt: Date | null;
    availableAt: Date | null;
    subject: {
      kind: string;
      characters: string;
      level: number;
      ugLevel: number;
      wkSubjectId: number | null;
      nLevel: number | null;
      meanings: string[];
      readings: string[];
      meaningMnemonic: string | null;
      readingMnemonic: string | null;
    };
  };
};

/** The two ladder columns, with only the one the answer was on filled. */
export function ukHistoryLevels(
  stream: LadderStreamValue | null,
  subject: { level: number; ugLevel: number },
): { unLevel: number | null; ugLevel: number | null } {
  return stream === LADDER_STREAMS.ug
    ? { unLevel: null, ugLevel: subject.ugLevel }
    : { unLevel: subject.level, ugLevel: null };
}

/** The catalogue's facts about a subject WaniKani teaches; nothing for the rest. */
export type UkHistoryContent = Pick<
  CatalogSubjectDetail,
  | "characters"
  | "meanings"
  | "readings"
  | "primaryReadings"
  | "radicals"
  | "visuallySimilar"
  | "usedInVocabulary"
  | "componentKanji"
  | "jlptLevel"
  | "jlptMeta"
>;

export function toUkHistoryRow(
  row: UkHistoryAttempt,
  member: { nickname: string; wkUsername: string },
  content?: UkHistoryContent,
): StudyHistoryRow {
  const subject = row.state.subject;
  const subjectType = ukSubjectTypeFor(subject.kind);
  const stage = row.newSrsStage ?? row.state.srsStage;
  const status = srsGroupingFromStage(stage);
  /* The row's own facts win where it has them: those are the items WaniKani
     never taught, and the catalogue has nothing to say about them. */
  const characters = subject.characters || content?.characters || "";
  const meanings = subject.meanings.length > 0 ? subject.meanings : (content?.meanings ?? []);
  const readings = subject.readings.length > 0 ? subject.readings : (content?.readings ?? []);
  const primaryReadings =
    subject.readings.length > 0 ? subject.readings.slice(0, 1) : (content?.primaryReadings ?? readings.slice(0, 1));
  const reading = primaryReadings[0] ?? null;
  const levels = ukHistoryLevels(row.curriculumStream, subject);

  return {
    id: row.id,
    accountId: row.accountId,
    nickname: member.nickname,
    wkUsername: member.wkUsername,
    /* No assignment row on our ladder; the state is keyed by subject, and the
       explorer threads the ladder's own id through as the assignment id. The
       subject id is the identity every feed shares, so the modal's marks and
       its detail fetch land on the same subject they would from WaniKani. */
    assignmentId: row.subjectId,
    subjectId: ukSubjectIdentity({ id: row.subjectId, wkSubjectId: subject.wkSubjectId }),
    subjectType,
    result: row.result,
    submittedAt: row.submittedAt.toISOString(),
    subjectLabel: characters,
    subjectReading: reading,
    subjectMeaning: meanings[0] ?? null,
    wkLevel: null,
    ...levels,
    srsStage: stage,
    srsBucket: status,
    subjectData: {
      subjectId: ukSubjectIdentity({ id: row.subjectId, wkSubjectId: subject.wkSubjectId }),
      subjectType,
      status,
      characters,
      meanings,
      readings,
      primaryReadings,
      radicals: content?.radicals,
      visuallySimilar: content?.visuallySimilar,
      usedInVocabulary: content?.usedInVocabulary,
      componentKanji: content?.componentKanji,
      meaningExplanation: subject.meaningMnemonic ?? undefined,
      readingExplanation: subject.readingMnemonic ?? undefined,
      jlptLevel: content?.jlptLevel ?? subject.nLevel,
      jlptMeta: content?.jlptMeta ?? null,
      startedAt: row.state.startedAt?.toISOString() ?? null,
      passedAt: row.state.passedAt?.toISOString() ?? null,
      availableAt: row.state.availableAt?.toISOString() ?? null,
      srsStage: stage,
    },
  };
}

export async function getUkStudyHistoryRows(args: {
  accountId: string;
  result?: ReviewResult;
}): Promise<StudyHistoryRow[]> {
  const [account, attempts] = await Promise.all([
    prisma.account.findUnique({
      where: { id: args.accountId },
      select: { nickname: true, wkUsername: true },
    }),
    prisma.ukReviewAttempt.findMany({
      where: { accountId: args.accountId, ...(args.result ? { result: args.result } : {}) },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        accountId: true,
        stateId: true,
        subjectId: true,
        result: true,
        newSrsStage: true,
        submittedAt: true,
        curriculumStream: true,
        state: {
          select: {
            srsStage: true,
            startedAt: true,
            passedAt: true,
            availableAt: true,
            subject: {
              select: {
                kind: true,
                characters: true,
                level: true,
                ugLevel: true,
                wkSubjectId: true,
                nLevel: true,
                meanings: true,
                readings: true,
                meaningMnemonic: true,
                readingMnemonic: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const member = {
    nickname: account?.nickname ?? args.accountId,
    wkUsername: account?.wkUsername ?? args.accountId,
  };
  const wanted = Array.from(
    new Set(attempts.flatMap((row) => (row.state.subject.wkSubjectId === null ? [] : [row.state.subject.wkSubjectId]))),
  );
  const details =
    wanted.length > 0 ? await getCatalogSubjectDetails(wanted).catch(() => new Map<number, CatalogSubjectDetail>()) : new Map();
  return attempts.map((row) => {
    const wkSubjectId = row.state.subject.wkSubjectId;
    return toUkHistoryRow(row, member, wkSubjectId === null ? undefined : details.get(wkSubjectId));
  });
}
