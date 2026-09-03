import { describe, expect, it } from "vitest";

import { isCatalogSubjectId } from "./domainConstants";
import { canTag, catalogId, taggableIds } from "./subjectFiler";
import { SUBJECT_TYPES } from "./domainConstants";

/*
 * A stand-in id is not a subject id.
 *
 * Surfaces that show items WaniKani never taught number their rows -1, -2, -3
 * down the page so React has a key and a selection has something to hold.
 * Sending one on asks the API about subject -1: the tag route answers 400, the
 * review-history route answers 400 on every open of a home-made list item, and
 * the list route rejects a whole PATCH, so one such item stopped every filing
 * change on that list from saving.
 */
describe("isCatalogSubjectId", () => {
  it("accepts a real subject id", () => {
    expect(isCatalogSubjectId(1)).toBe(true);
    expect(isCatalogSubjectId(8769)).toBe(true);
  });

  it("rejects the stand-ins a page numbers its own rows with", () => {
    expect(isCatalogSubjectId(-1)).toBe(false);
    expect(isCatalogSubjectId(-2)).toBe(false);
    expect(isCatalogSubjectId(0)).toBe(false);
  });

  it("rejects what is not a number at all", () => {
    expect(isCatalogSubjectId(null)).toBe(false);
    expect(isCatalogSubjectId(undefined)).toBe(false);
    expect(isCatalogSubjectId(Number.NaN)).toBe(false);
    expect(isCatalogSubjectId(1.5)).toBe(false);
  });
});

/* The filer already knew this rule; it is now the one definition of it. */
describe("the filer reads the same rule", () => {
  const hit = (subjectId: number | null) => ({
    subjectId,
    subjectType: SUBJECT_TYPES.kanji,
    glyph: "水",
    slug: null,
  });

  it("keeps a real id and drops a stand-in", () => {
    expect(catalogId(hit(440))).toBe(440);
    expect(catalogId(hit(-1))).toBeNull();
    expect(catalogId(hit(null))).toBeNull();
  });

  it("will not tag a row that has no subject behind it", () => {
    expect(canTag(hit(440))).toBe(true);
    expect(canTag(hit(-3))).toBe(false);
  });

  it("asks the tag store only about ids it could answer for", () => {
    expect(taggableIds([hit(440), hit(-1), hit(440), hit(-2)])).toEqual([440]);
  });
});
