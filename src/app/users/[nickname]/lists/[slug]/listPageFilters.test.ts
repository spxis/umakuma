import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SUBJECT_TYPES, WK_STATUSES } from "@/lib/domainConstants";
import type { ListPageItem } from "@/lib/listPageItems";

import { SRS_STATUS_FILTER_ALL } from "../../shared/SrsStatusFilterGroup";

import {
  LIST_TYPE_FILTER_ALL,
  listHasMixedStages,
  listHasMixedTypes,
  listSrsCounts,
  listTypeChipStates,
  listTypeCounts,
  matchesListSrsFilter,
  matchesListTypeFilter,
} from "./listPageFilters";

function item(subjectId: number, subjectType: string, srsStage = 0): ListPageItem {
  return {
    subjectId,
    subjectType,
    characters: String(subjectId),
    meanings: [],
    readings: [],
    srsStage,
    studyTags: { favorite: false, trouble: false, burned: false },
    listKind: subjectType,
    listKey: String(subjectId),
    note: null,
  } as unknown as ListPageItem;
}

const MIXED = [
  item(1, SUBJECT_TYPES.kanji),
  item(2, SUBJECT_TYPES.kanji),
  item(3, SUBJECT_TYPES.vocabulary),
  item(4, SUBJECT_TYPES.radical),
];

describe("what a list holds", () => {
  it("counts each kind, and the lot", () => {
    const counts = listTypeCounts(MIXED);
    expect(counts.all).toBe(4);
    expect(counts[SUBJECT_TYPES.kanji]).toBe(2);
    expect(counts[SUBJECT_TYPES.vocabulary]).toBe(1);
    expect(counts[SUBJECT_TYPES.radical]).toBe(1);
  });

  /* The chips are counted off what is on screen, so a removal moves them. */
  it("counts nothing as nothing rather than as absent", () => {
    const counts = listTypeCounts([]);
    expect(counts.all).toBe(0);
    expect(counts[SUBJECT_TYPES.radical]).toBe(0);
  });

  it("offers the filter only where there is more than one kind to pick", () => {
    expect(listHasMixedTypes(listTypeCounts(MIXED))).toBe(true);
    expect(listHasMixedTypes(listTypeCounts([item(1, SUBJECT_TYPES.kanji), item(2, SUBJECT_TYPES.kanji)]))).toBe(false);
    expect(listHasMixedTypes(listTypeCounts([]))).toBe(false);
  });
});

describe("narrowing a list to one kind", () => {
  it("keeps everything under All", () => {
    expect(MIXED.every((row) => matchesListTypeFilter(row, LIST_TYPE_FILTER_ALL))).toBe(true);
  });

  it("keeps only the chosen kind", () => {
    const kept = MIXED.filter((row) => matchesListTypeFilter(row, SUBJECT_TYPES.vocabulary));
    expect(kept.map((row) => row.subjectId)).toEqual([3]);
  });

  /* All lights every chip; a kind lights only its own. */
  it("lights the chips the way the reader chose", () => {
    expect(listTypeChipStates(LIST_TYPE_FILTER_ALL)).toEqual({
      [SUBJECT_TYPES.radical]: true,
      [SUBJECT_TYPES.kanji]: true,
      [SUBJECT_TYPES.vocabulary]: true,
    });
    expect(listTypeChipStates(SUBJECT_TYPES.kanji)).toEqual({
      [SUBJECT_TYPES.radical]: false,
      [SUBJECT_TYPES.kanji]: true,
      [SUBJECT_TYPES.vocabulary]: false,
    });
  });
});

/*
 * The point of the ticket, and the thing a unit test over the helpers alone
 * would not catch: the page must draw the shared coloured chips rather than
 * grow a set of its own again.
 */
describe("the chips a list page draws", () => {
  const source = readFileSync(join(process.cwd(), "src/app/users/[nickname]/lists/[slug]/ListPageControls.tsx"), "utf8");

  it("filters with the shared subject-type group", () => {
    expect(source).toContain("SubjectTypeFilterGroup");
  });

  it("keeps no chip styling of its own", () => {
    expect(source).not.toContain("chipClass");
    expect(source).not.toContain("LIST_ITEM_KIND_DISPLAY");
  });
});

/*
 * The stages a list holds, and the chips over them. Stage 0 is Locked, 1-4
 * Apprentice, 5-6 Guru, 7 Master, 8 Enlightened, 9 Burned - the same
 * derivation the SRS badge on the row already uses.
 */
const STAGED = [
  item(1, SUBJECT_TYPES.kanji, 9),
  item(2, SUBJECT_TYPES.kanji, 9),
  item(3, SUBJECT_TYPES.kanji, 6),
  item(4, SUBJECT_TYPES.vocabulary, 0),
];

describe("how far along a list is", () => {
  it("counts each stage the way the row badges it", () => {
    const counts = listSrsCounts(STAGED);
    expect(counts.all).toBe(4);
    expect(counts[WK_STATUSES.burned]).toBe(2);
    expect(counts[WK_STATUSES.guru]).toBe(1);
    expect(counts[WK_STATUSES.locked]).toBe(1);
    expect(counts[WK_STATUSES.apprentice]).toBe(0);
  });

  it("keeps only the chosen stage", () => {
    expect(STAGED.filter((row) => matchesListSrsFilter(row, WK_STATUSES.burned)).map((row) => row.subjectId)).toEqual([1, 2]);
    expect(STAGED.every((row) => matchesListSrsFilter(row, SRS_STATUS_FILTER_ALL))).toBe(true);
  });

  it("offers the stage chips only where the stages differ", () => {
    expect(listHasMixedStages(listSrsCounts(STAGED))).toBe(true);
    expect(listHasMixedStages(listSrsCounts([item(1, SUBJECT_TYPES.kanji, 9), item(2, SUBJECT_TYPES.kanji, 9)]))).toBe(false);
  });

  /*
   * The counts are the point of the ticket: each row of chips counts over what
   * the other filters kept, so a chip saying 1 gives one row rather than three.
   */
  it("counts a stage against the kind already chosen", () => {
    const kanjiOnly = STAGED.filter((row) => matchesListTypeFilter(row, SUBJECT_TYPES.kanji));
    const counts = listSrsCounts(kanjiOnly);
    expect(counts.all).toBe(3);
    expect(counts[WK_STATUSES.locked]).toBe(0);
  });

  it("counts a kind against the stage already chosen", () => {
    const burnedOnly = STAGED.filter((row) => matchesListSrsFilter(row, WK_STATUSES.burned));
    const counts = listTypeCounts(burnedOnly);
    expect(counts.all).toBe(2);
    expect(counts[SUBJECT_TYPES.vocabulary]).toBe(0);
  });
});

describe("the stage chips a list page draws", () => {
  const source = readFileSync(join(process.cwd(), "src/app/users/[nickname]/lists/[slug]/ListPageControls.tsx"), "utf8");

  it("filters by stage with the shared group", () => {
    expect(source).toContain("SrsStatusFilterGroup");
  });
});

/* And the explorer that used to keep a private copy of those colours. */
describe("the level explorer's status chips", () => {
  const source = readFileSync(
    join(process.cwd(), "src/app/users/[nickname]/level-explorer/components/LevelExplorerFilterPanel.tsx"),
    "utf8",
  );

  it("takes its colours from the badge it filters", () => {
    expect(source).toContain("srsBucketBadgeClass");
    expect(source).not.toContain("function wkStatusToneClass");
  });
});
