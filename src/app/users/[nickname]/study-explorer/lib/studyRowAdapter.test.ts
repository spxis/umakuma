import { describe, expect, it } from "vitest";

import { QUEUE_TYPES, SUBJECT_TYPES, WK_STATUSES } from "@/lib/domainConstants";

import { toStudyRow } from "./studyRowAdapter";
import type { StudyQueueItem } from "./studyExplorerTypes";

function item(overrides: Partial<StudyQueueItem> = {}): StudyQueueItem {
  return {
    subjectId: 440,
    assignmentId: 9001,
    queueType: QUEUE_TYPES.review,
    subjectType: SUBJECT_TYPES.kanji,
    wkLevel: 12,
    characters: "喜",
    meanings: ["Rejoice", "Delight"],
    readings: ["き", "よろこ"],
    primaryReadings: ["き"],
    srsStage: 3,
    status: WK_STATUSES.apprentice,
    availableAt: null,
    ...overrides,
  } as StudyQueueItem;
}

describe("toStudyRow", () => {
  it("takes the primary meaning and reading for the row's two lines", () => {
    const row = toStudyRow(item());
    expect(row.glyph).toBe("喜");
    expect(row.meaning).toBe("Rejoice");
    expect(row.reading).toBe("き");
    expect(row.wkLevel).toBe(12);
    expect(row.srsStage).toBe(3);
    expect(row.srsBucket).toBe(WK_STATUSES.apprentice);
  });

  /*
   * A lesson and a review can hold the same subject at once, so keying on the
   * subject alone would collapse two rows into one.
   */
  it("keys on the queue as well as the subject", () => {
    expect(toStudyRow(item()).key).not.toBe(
      toStudyRow(item({ queueType: QUEUE_TYPES.lesson })).key,
    );
  });

  it("falls back to a non-primary reading when no primary is marked", () => {
    expect(toStudyRow(item({ primaryReadings: [] })).reading).toBe("き");
  });

  it("leaves the reading empty for a radical, which has none", () => {
    const row = toStudyRow(item({ readings: [], primaryReadings: [], subjectType: SUBJECT_TYPES.radical }));
    expect(row.reading).toBeNull();
    expect(row.subjectType).toBe(SUBJECT_TYPES.radical);
  });

  it("survives an item with no meanings rather than throwing", () => {
    expect(toStudyRow(item({ meanings: [] })).meaning).toBe("");
  });
});
