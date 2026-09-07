import { describe, expect, it } from "vitest";

import { STUDY_QUEUE_TYPES, STUDY_SRS_FILTERS } from "./studyExplorerDomain";
import { effectiveQueueFilters, usableWaitSortOrder } from "./studyExplorerState";

describe("what the queue mode and the source override", () => {
  const base = {
    srsFilter: STUDY_SRS_FILTERS.apprentice,
    srsStageFilter: null,
    recentOnly: true,
    showLocked: false,
    normalizeSrsStageFilter: () => null,
  };

  it("answers a lesson queue differently rather than ignoring the filters", () => {
    const lesson = effectiveQueueFilters({ ...base, queueMode: STUDY_QUEUE_TYPES.lesson });
    /* Nothing has an SRS stage yet, nothing is locked, and nothing has been
       seen recently enough to be recent. */
    expect(lesson.srsFilter).toBe(STUDY_SRS_FILTERS.all);
    expect(lesson.srsStageFilter).toBeNull();
    expect(lesson.recentOnly).toBe(false);
    expect(lesson.showLocked).toBe(true);
  });

  it("leaves a review queue's filters alone", () => {
    const review = effectiveQueueFilters({ ...base, queueMode: STUDY_QUEUE_TYPES.review });
    expect(review.srsFilter).toBe(STUDY_SRS_FILTERS.apprentice);
    expect(review.recentOnly).toBe(true);
    expect(review.showLocked).toBe(false);
  });

  it("drops a difficulty sort where there is no history to sort by", () => {
    /* A member's own upload has no review history, and a lesson has none yet. */
    expect(usableWaitSortOrder("hardest", { queueMode: STUDY_QUEUE_TYPES.review, studySourceIsCustom: true })).toBe("oldest_wait");
    expect(usableWaitSortOrder("hardest", { queueMode: STUDY_QUEUE_TYPES.lesson, studySourceIsCustom: false })).toBe("oldest_wait");
    expect(usableWaitSortOrder("hardest", { queueMode: STUDY_QUEUE_TYPES.review, studySourceIsCustom: false })).toBe("hardest");
    /* An order that needs no history is left alone wherever it is asked. */
    expect(usableWaitSortOrder("oldest_wait", { queueMode: STUDY_QUEUE_TYPES.lesson, studySourceIsCustom: true })).toBe("oldest_wait");
  });
});
