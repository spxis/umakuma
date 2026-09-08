import { describe, expect, it } from "vitest";

import { UK_SUBJECT_ID_BASE } from "@/lib/uk/ukSubjectIdentity";

import { CUSTOM_ITEM_ID_BASE, customItemIdFromIdentity, customItemIdentity, isCustomOnlySubjectId, readWkSubjectId } from "./customItemIdentity";

describe("what a library item is called", () => {
  it("answers to WaniKani's id where the enrichment linked it", () => {
    expect(customItemIdentity({ id: 12, metadata: { wk: { subjectId: 689 } } })).toBe(689);
    expect(readWkSubjectId({ wk: { subjectId: 0 } })).toBeNull();
    expect(readWkSubjectId(null)).toBeNull();
  });

  it("takes a reserved id otherwise, below our ladder's range", () => {
    const id = customItemIdentity({ id: 12, metadata: null });
    expect(id).toBe(CUSTOM_ITEM_ID_BASE + 12);
    expect(isCustomOnlySubjectId(id)).toBe(true);
    expect(customItemIdFromIdentity(id)).toBe(12);
    expect(CUSTOM_ITEM_ID_BASE + 10_000_000).toBeLessThanOrEqual(UK_SUBJECT_ID_BASE);
  });

  it("never mistakes a WaniKani id or one of our ladder's for a library item", () => {
    expect(isCustomOnlySubjectId(689)).toBe(false);
    expect(customItemIdFromIdentity(UK_SUBJECT_ID_BASE + 5)).toBeNull();
  });
});
