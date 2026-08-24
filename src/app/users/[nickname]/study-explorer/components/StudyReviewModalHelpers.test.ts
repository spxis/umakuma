import { describe, expect, it } from "vitest";

import { filterStudyModeRelatedItems } from "./StudyReviewModalHelpers";

describe("filterStudyModeRelatedItems", () => {
  const items = [
    { subjectId: 1, label: "一", wkLevel: 1 },
    { subjectId: 2, label: "二", wkLevel: 3 },
    { subjectId: 3, label: "三", wkLevel: 4 },
    { subjectId: 4, label: "?", wkLevel: null },
  ];

  it("keeps related subjects through 2 levels above the current level", () => {
    expect(filterStudyModeRelatedItems(items, true, 1)?.map((item) => item.subjectId)).toEqual([1, 2, 4]);
  });

  it("leaves all related subjects visible outside Study Mode", () => {
    expect(filterStudyModeRelatedItems(items, false, 1)).toBe(items);
  });

  it("leaves related subjects unchanged when no current level is available", () => {
    expect(filterStudyModeRelatedItems(items, true, null)).toBe(items);
  });
});