import "server-only";

import { LIST_ITEM_KINDS, QUEUE_TYPES, SUBJECT_TYPES } from "./domainConstants";
import { subjectHref } from "./globalSearch";
import { prisma } from "./prisma";
import { getCatalogSubjectDetails, type CatalogSubjectDetail } from "./subjectCatalogDetails";
import type { StudyListItemRef } from "./studyListRules";
import { fetchStudyTagRows } from "./studySubjectTags";
import type { StudyTagListItem } from "./studyTagLists";
import { parseAssignmentCacheRows, srsLabel } from "./wanikani/helpers";

/**
 * A set of subjects, as the shared list viewer wants them.
 *
 * The Trouble and Favourites lists and a saved list are the same thing to a
 * reader - a set of subjects with their meanings, readings and SRS state - and
 * differ only in how the set was chosen. This is the half they share, so the
 * saved-list route does not repeat the assignment-cache reading and the item
 * assembly the tags route had already written.
 */

type AssignmentFacts = {
  assignmentId: number;
  srsStage: number;
  unlockedAt: string | null;
  startedAt: string | null;
  passedAt: string | null;
  availableAt: string | null;
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

/**
 * What the account's cached assignments say about a set of subjects.
 *
 * A member's own set can outlive an assignment - an item can be saved to a list
 * or tagged from an explorer long before it is unlocked - so anything missing
 * here is reported as locked rather than dropped from the list.
 */
export async function loadAssignmentFacts(accountId: string): Promise<Map<number, AssignmentFacts>> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { assignmentCache: true },
  });
  const facts = new Map<number, AssignmentFacts>();
  if (!account) return facts;

  for (const row of parseAssignmentCacheRows(account.assignmentCache)) {
    const subjectId = row.data.subject_id;
    if (typeof subjectId !== "number") continue;
    facts.set(subjectId, {
      assignmentId: row.id,
      srsStage: typeof row.data.srs_stage === "number" ? row.data.srs_stage : 0,
      unlockedAt: readString(row.data.unlocked_at),
      startedAt: readString(row.data.started_at),
      passedAt: readString(row.data.passed_at),
      availableAt: readString(row.data.available_at),
    });
  }
  return facts;
}

/** Builds one list item from a catalogue subject and whatever the account knows. */
export function toStudyTagListItem(
  subject: CatalogSubjectDetail,
  assignment: AssignmentFacts | undefined,
  studyTags: { favorite: boolean; trouble: boolean },
): StudyTagListItem {
  const srsStage = assignment?.srsStage ?? 0;
  return {
    assignmentId: assignment?.assignmentId ?? -1,
    queueType: QUEUE_TYPES.review,
    subjectId: subject.subjectId,
    subjectType: subject.subjectType,
    wkLevel: subject.wkLevel,
    characters: subject.characters,
    meanings: subject.meanings,
    readings: subject.readings,
    primaryReadings: subject.primaryReadings,
    jlptLevel: subject.jlptLevel,
    srsStage,
    status: srsLabel(srsStage, srsStage <= 0 || !assignment?.unlockedAt),
    startedAt: assignment?.startedAt ?? null,
    passedAt: assignment?.passedAt ?? null,
    availableAt: assignment?.availableAt ?? null,
    studyTags,
  };
}

/** A list item as a page anybody can read shows it: no member state at all. */
export type ListSubjectRow = {
  key: string;
  kind: StudyListItemRef["kind"];
  subjectId: number | null;
  subjectType: string;
  /** WaniKani's name for a radical; what the filer keys a radical by. */
  slug: string | null;
  glyph: string;
  meaning: string;
  reading: string | null;
  wkLevel: number | null;
  href: string | null;
};

/**
 * A list's items for a reader who is not the owner - or is not signed in.
 *
 * Nothing of anyone's account rides along: no SRS state, no tags. WaniKani
 * subjects come from the catalogue; a kanji WaniKani never taught takes its
 * meaning and readings from the JLPT table, so a list of N1 kanji reads as
 * kanji rather than as a row of blanks. Order is the list's own.
 */
export async function fetchListSubjectRows(items: StudyListItemRef[]): Promise<ListSubjectRow[]> {
  const subjectIds = [...new Set(items.flatMap((item) => (typeof item.subjectId === "number" ? [item.subjectId] : [])))];
  const unnamedKanji = items.filter((item) => item.subjectId == null && item.kind === LIST_ITEM_KINDS.kanji).map((item) => item.key);

  const [details, jlptRows] = await Promise.all([
    subjectIds.length > 0 ? getCatalogSubjectDetails(subjectIds) : Promise.resolve(new Map<number, CatalogSubjectDetail>()),
    unnamedKanji.length > 0
      ? prisma.jlptKanji.findMany({
          where: { kanji: { in: unnamedKanji } },
          select: { kanji: true, primaryMeaning: true, meanings: true, onReadings: true, kunReadings: true },
        })
      : Promise.resolve([]),
  ]);
  const jlptByKanji = new Map(jlptRows.map((row) => [row.kanji, row]));

  return items.flatMap((item): ListSubjectRow[] => {
    if (typeof item.subjectId === "number") {
      const subject = details.get(item.subjectId);
      if (!subject) return [];
      return [
        {
          key: `${item.kind}:${item.key}`,
          kind: item.kind,
          subjectId: subject.subjectId,
          subjectType: subject.subjectType,
          slug: item.kind === LIST_ITEM_KINDS.radical ? item.key : null,
          glyph: subject.characters,
          meaning: subject.meanings[0] ?? "",
          reading: subject.primaryReadings[0] ?? subject.readings[0] ?? null,
          wkLevel: subject.wkLevel,
          href: subjectHref({ subjectType: subject.subjectType, characters: subject.characters, slug: null }),
        },
      ];
    }
    if (item.kind === LIST_ITEM_KINDS.kanji) {
      const jlpt = jlptByKanji.get(item.key);
      return [
        {
          key: `${item.kind}:${item.key}`,
          kind: item.kind,
          subjectId: null,
          subjectType: SUBJECT_TYPES.kanji,
          slug: null,
          glyph: item.key,
          meaning: jlpt?.primaryMeaning ?? jlpt?.meanings[0] ?? "",
          reading: jlpt?.onReadings[0] ?? jlpt?.kunReadings[0] ?? null,
          wkLevel: null,
          href: subjectHref({ subjectType: SUBJECT_TYPES.kanji, characters: item.key, slug: null }),
        },
      ];
    }
    return [];
  });
}

/**
 * The subjects behind a saved list's items, in the order the list holds them.
 *
 * Order is the member's: they chose these in a sequence, and a viewer that
 * re-sorts them shows a different list from the one on the card. An item the
 * catalogue does not name - a kanji WaniKani never taught, a sentence - drops
 * out here rather than rendering as a blank row; the count on the card is of
 * items, and this is of subjects, so the two can legitimately differ.
 */
export async function fetchStudyListItems(
  accountId: string,
  items: StudyListItemRef[],
): Promise<StudyTagListItem[]> {
  const subjectIds = [...new Set(items.flatMap((item) => (typeof item.subjectId === "number" ? [item.subjectId] : [])))];
  if (subjectIds.length === 0) return [];

  const [details, assignments, tagRows] = await Promise.all([
    getCatalogSubjectDetails(subjectIds),
    loadAssignmentFacts(accountId),
    fetchStudyTagRows(accountId),
  ]);

  const tagsBySubject = new Map(tagRows.map((row) => [row.subjectId, row]));

  return subjectIds.flatMap((subjectId) => {
    const subject = details.get(subjectId);
    if (!subject) return [];
    const tags = tagsBySubject.get(subjectId);
    return [
      toStudyTagListItem(subject, assignments.get(subjectId), {
        favorite: tags?.favorite ?? false,
        trouble: tags?.trouble ?? false,
      }),
    ];
  });
}
