import "server-only";

import { QUEUE_TYPES } from "./domainConstants";
import { prisma } from "./prisma";
import { getCatalogSubjectDetails, type CatalogSubjectDetail } from "./subjectCatalogDetails";
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

/**
 * The subjects behind a saved list's characters, in the order the list holds
 * them.
 *
 * Order is the member's: they chose these in a sequence, and a viewer that
 * re-sorts them shows a different list from the one on the card. A character
 * the catalogue does not know drops out rather than rendering as a blank row -
 * the count on the card is of characters, and this is of subjects, so the two
 * can legitimately differ.
 */
export async function fetchStudyListItems(
  accountId: string,
  characters: string[],
): Promise<StudyTagListItem[]> {
  if (characters.length === 0) return [];

  const rows = await prisma.wkSubjectCatalog.findMany({
    where: { characters: { in: characters } },
    /* The catalogue's key is `wkSubjectId`; `subjectId` is what everything downstream calls it. */
    select: { wkSubjectId: true, characters: true },
  });

  /*
   * One character can be both a kanji and a vocabulary word - 上 is taught
   * twice - so this keeps the first the catalogue returns rather than showing
   * the same glyph twice in a list the member sees as holding it once.
   */
  const subjectIdByCharacter = new Map<string, number>();
  for (const row of rows) {
    /* Radicals can be image-only, with no characters to have been saved by. */
    if (row.characters && !subjectIdByCharacter.has(row.characters)) {
      subjectIdByCharacter.set(row.characters, row.wkSubjectId);
    }
  }

  const subjectIds = characters
    .map((character) => subjectIdByCharacter.get(character))
    .filter((subjectId): subjectId is number => typeof subjectId === "number");

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
