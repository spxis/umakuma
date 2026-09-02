import { SRS_BUCKETS, SUBJECT_TYPES, isWkStatus } from "@/lib/domainConstants";
import type { SubjectListRow } from "@/app/shared/subjectListView";

import type { JlptItem, UserKanjiItem } from "../../explorerTypes";
import { jlptHeading } from "./jlptDisplay";

/** Everything both densities derive from one JLPT entry, worked out once. */
export type JlptView = {
  userMatch: UserKanjiItem | undefined;
  heading: string;
  primaryReading: string | null;
  fallbackReadings: string[];
};


/**
 * What a JLPT entry shows, from the three places it can come from.
 *
 * A JLPT kanji is not a WaniKani subject: the level, the meanings and the
 * readings come from the JLPT table, from the member's own WaniKani data where
 * the two overlap. Both the
 * card and the row need the same answer, so they ask here rather than each
 * working it out - which is how the two used to disagree about which reading
 * was primary.
 */
export function toJlptView(
  item: JlptItem,
  userKanjiByChar: Map<string, UserKanjiItem>,
): JlptView {
  const userMatch = userKanjiByChar.get(item.kanji);
  const dbReadings = [...item.kunReadings, ...item.onReadings, ...item.nanoriReadings];
  return {
    userMatch,
    heading: jlptHeading(
      item.primaryMeaning,
      userMatch?.meanings,
      item.meanings,
      item.kanji,
    ),
    primaryReading: userMatch
      ? (userMatch.primaryReadings ?? [])[0] ?? (userMatch.readings ?? [])[0] ?? null
      : dbReadings[0] ?? null,
    fallbackReadings: dbReadings,
  };
}

/** A JLPT row is an entry, what it displays, and the member's data for it. */
export type JlptRow = SubjectListRow & { item: JlptItem; view: JlptView };

/**
 * A JLPT entry as the shared row list wants it.
 *
 * There is no subject id unless the member's WaniKani account happens to teach
 * this character, so the key is the kanji and the level is whatever their own
 * data says - the JLPT catalogue has no WaniKani level of its own.
 */
export function toJlptRow(item: JlptItem, view: JlptView): JlptRow {
  const srsStage = typeof view.userMatch?.srsStage === "number" ? view.userMatch.srsStage : null;
  return {
    key: `${item.nLevel}-${item.kanji}`,
    subjectId: view.userMatch?.subjectId ?? 0,
    subjectType: SUBJECT_TYPES.kanji,
    glyph: item.kanji,
    meaning: view.heading,
    reading: view.primaryReading ?? view.fallbackReadings[0] ?? null,
    wkLevel: typeof view.userMatch?.wkLevel === "number" ? view.userMatch.wkLevel : null,
    srsStage,
    /* Untracked is not "unknown": the member simply has not met it yet. */
    srsBucket: isWkStatus(view.userMatch?.status) ? view.userMatch.status : SRS_BUCKETS.unknown,
    item,
    view,
  };
}
