import "server-only";

import type { SubjectType } from "@/lib/domainConstants";
import { prisma } from "@/lib/prisma";
import { getCatalogSubjectDetails } from "@/lib/subjectCatalogDetails";

import { customItemIdFromIdentity, customItemIdentity } from "@/lib/customStudy/customItemIdentity";
import { customItemTypeToSubjectType } from "@/lib/customStudy/customStudyQueue";

import { ukSubjectTypeFor } from "./ukExplorerFeed";
import { ukSubjectIdFromIdentity, ukSubjectIdentity } from "./ukSubjectIdentity";

/**
 * A tagged subject, whichever ladder it came from.
 *
 * The Trouble and Favourites lists resolved every tag row through the
 * WaniKani catalogue, which was every subject there was. A mark on one of
 * the 176 subjects only our ladder teaches carries a reserved id the
 * catalogue has never heard of, so it resolved to nothing and the list
 * silently lost it. This answers every kind: the catalogue for WaniKani's
 * ids, the ladder's own row for ours, the library's item for a member's.
 */
export type TaggedSubject = {
  subjectId: number;
  subjectType: SubjectType;
  /** Null for a subject WaniKani never taught. */
  wkLevel: number | null;
  characters: string;
  meanings: string[];
  readings: string[];
  primaryReadings: string[];
  jlptLevel: number | null;
};

/** The ladder's row as the lists want it, keyed by its reserved identity. */
export function ukOnlyTaggedSubject(row: {
  id: number;
  kind: string;
  characters: string;
  meanings: string[];
  readings: string[];
  nLevel: number | null;
}): TaggedSubject {
  return {
    subjectId: ukSubjectIdentity({ id: row.id, wkSubjectId: null }),
    subjectType: ukSubjectTypeFor(row.kind),
    wkLevel: null,
    characters: row.characters,
    meanings: row.meanings,
    readings: row.readings,
    primaryReadings: row.readings.slice(0, 1),
    jlptLevel: row.nLevel,
  };
}

/** A library item as the lists want it, keyed by its reserved identity. */
export function customOnlyTaggedSubject(item: {
  id: number;
  itemType: Parameters<typeof customItemTypeToSubjectType>[0];
  metadata: unknown;
  characters: string;
  meanings: string[];
  readings: string[];
  primaryReading: string | null;
}): TaggedSubject {
  return {
    subjectId: customItemIdentity({ id: item.id, metadata: null }),
    subjectType: customItemTypeToSubjectType(item.itemType, item.metadata),
    wkLevel: null,
    characters: item.characters,
    meanings: item.meanings,
    readings: item.readings,
    primaryReadings: item.primaryReading ? [item.primaryReading] : item.readings.slice(0, 1),
    jlptLevel: null,
  };
}

export async function taggedSubjectDetails(subjectIds: readonly number[]): Promise<Map<number, TaggedSubject>> {
  const ours = subjectIds.flatMap((subjectId) => {
    const ukId = ukSubjectIdFromIdentity(subjectId);
    return ukId === null ? [] : [ukId];
  });
  const library = subjectIds.flatMap((subjectId) => {
    const itemId = customItemIdFromIdentity(subjectId);
    return itemId === null ? [] : [itemId];
  });
  const theirs = subjectIds.filter((subjectId) => ukSubjectIdFromIdentity(subjectId) === null && customItemIdFromIdentity(subjectId) === null);

  const [catalogue, rows, items] = await Promise.all([
    getCatalogSubjectDetails(theirs),
    ours.length > 0
      ? prisma.ukSubject.findMany({
          where: { id: { in: ours } },
          select: { id: true, kind: true, characters: true, meanings: true, readings: true, nLevel: true },
        })
      : [],
    library.length > 0
      ? prisma.customStudyItem.findMany({
          where: { id: { in: library } },
          select: { id: true, itemType: true, metadata: true, characters: true, meanings: true, readings: true, primaryReading: true },
        })
      : [],
  ]);

  const found = new Map<number, TaggedSubject>();
  for (const [subjectId, detail] of catalogue) {
    found.set(subjectId, {
      subjectId,
      subjectType: detail.subjectType,
      wkLevel: detail.wkLevel,
      characters: detail.characters,
      meanings: detail.meanings,
      readings: detail.readings,
      primaryReadings: detail.primaryReadings,
      jlptLevel: detail.jlptLevel,
    });
  }
  for (const row of rows) {
    const subject = ukOnlyTaggedSubject(row);
    found.set(subject.subjectId, subject);
  }
  for (const item of items) {
    const subject = customOnlyTaggedSubject(item);
    found.set(subject.subjectId, subject);
  }
  return found;
}
