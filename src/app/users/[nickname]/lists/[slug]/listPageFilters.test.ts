import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SUBJECT_TYPES } from "@/lib/domainConstants";
import type { ListPageItem } from "@/lib/listPageItems";

import {
  LIST_TYPE_FILTER_ALL,
  listHasMixedTypes,
  listTypeChipStates,
  listTypeCounts,
  matchesListTypeFilter,
} from "./listPageFilters";

function item(subjectId: number, subjectType: string): ListPageItem {
  return {
    subjectId,
    subjectType,
    characters: String(subjectId),
    meanings: [],
    readings: [],
    srsStage: 0,
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
  const source = readFileSync(join(process.cwd(), "src/app/users/[nickname]/lists/[slug]/ListPageView.tsx"), "utf8");

  it("filters with the shared subject-type group", () => {
    expect(source).toContain("SubjectTypeFilterGroup");
  });

  it("keeps no chip styling of its own", () => {
    expect(source).not.toContain("chipClass");
    expect(source).not.toContain("LIST_ITEM_KIND_DISPLAY");
  });
});
