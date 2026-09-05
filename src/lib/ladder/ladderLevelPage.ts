import { SUBJECT_TYPES } from "@/lib/domainConstants";
import type { SubjectListRow } from "@/app/shared/subjectListView";
import { SRS_BUCKETS } from "@/lib/domainConstants";

import type { LadderRow } from "./ladderCrosswalk";
import { groupLadderByLevel, summarizeLadderLevels, type LadderLevelGroup, type LadderLevelSummary } from "./ladderQuery";

/**
 * One level of the curriculum, and the shape of the hundred around it.
 *
 * The explorer used to page ten levels at a time behind a single address, so
 * the reader could not link to a level, come back to one, or say which one
 * they were looking at. A level to an address is what the other explorers do,
 * and it means the page loads one level's worth rather than ten.
 */

export type LadderLevelPage = {
  group: LadderLevelGroup;
  /** Every level, for the picker: enough to draw a hundred chips with counts. */
  levels: LadderLevelSummary[];
};

export function ladderLevelPage(rows: readonly LadderRow[], levels: number, level: number): LadderLevelPage {
  /* One level per page, so the page number *is* the level - and the running
     totals `groupLadderByLevel` keeps still count the whole ladder up to it. */
  const { groups } = groupLadderByLevel(rows, levels, level, 1);
  const group = groups[0] ?? {
    level,
    nLevel: null,
    radicals: [],
    kanji: [],
    vocabulary: [],
    kanjiThrough: 0,
    wordsThrough: 0,
  };
  return { group, levels: summarizeLadderLevels(rows, levels) };
}

/**
 * A ladder row as the shared subject list draws it.
 *
 * The explorer drew its own tiles, which is why it was the one page whose
 * kanji looked like nowhere else. `SubjectCards` and `SubjectRows` take this
 * shape, so the level reads like every other list of subjects on the site and
 * gets the density toggle for free.
 *
 * `srsStage` is null throughout: this is the curriculum, not the member's
 * progress through it, and colouring a browse page by SRS state would make
 * two different questions look like one.
 */
export function ladderRowAsSubject(row: LadderRow): SubjectListRow {
  return {
    key: row.key,
    subjectId: row.wkSubjectId ?? 0,
    subjectType: row.kind,
    glyph: row.characters,
    meaning: row.primaryMeaning ?? "",
    reading: null,
    wkLevel: row.wkLevel,
    srsStage: null,
    srsBucket: SRS_BUCKETS.locked,
  };
}

/** The three groups a level is met in, in the order it is met. */
export function ladderLevelSections(group: LadderLevelGroup): { type: string; rows: LadderRow[] }[] {
  return [
    { type: SUBJECT_TYPES.radical, rows: group.radicals },
    { type: SUBJECT_TYPES.kanji, rows: group.kanji },
    { type: SUBJECT_TYPES.vocabulary, rows: group.vocabulary },
  ];
}
