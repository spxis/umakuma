import { describe, expect, it } from "vitest";

import { REVIEW_RESULTS } from "@/lib/domainConstants";

import {
  diffReviewStats,
  parseReviewStatSnapshot,
  toReviewStatRows,
  type ReviewStatRow,
} from "./reviewStatDeltas";

const AT = new Date("2026-09-07T06:31:38.754Z");
const SEEN = new Date("2026-09-07T10:30:00.000Z");

function row(subjectId: number, counts: [number, number, number, number], updatedAt: Date | null = AT): ReviewStatRow {
  return { subjectId, counts, updatedAt };
}

/*
 * John: "My reviews are not showing up in my History!!! last was 2 days ago,
 * which I did in the Wanikani app."
 *
 * They could not: WaniKani's /reviews collection is empty for an account that
 * answers in their app - measured at total_count 0 against his own token on
 * 2026-09-07, the same morning /review_statistics said 06:31. So a review is
 * inferred from the counters instead, and these pin the arithmetic.
 */
describe("the first look at an account", () => {
  it("is a snapshot and nothing else", () => {
    const { attempts, snapshot } = diffReviewStats(null, [row(1, [12, 5, 12, 0])], SEEN);
    expect(attempts).toEqual([]);
    expect(snapshot["1"]).toEqual([12, 5, 12, 0]);
  });
});

describe("what the counters say happened", () => {
  it("counts one review, not two, when both halves move", () => {
    /* A kanji review asks the meaning and the reading; answering it moves
       both counters, and it is still one review. */
    const { attempts } = diffReviewStats({ "1": [10, 0, 10, 0] }, [row(1, [11, 0, 11, 0])], SEEN);
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toEqual({ subjectId: 1, result: REVIEW_RESULTS.correct, at: AT });
  });

  it("counts a radical's single half as one review", () => {
    /* A radical has a meaning and no reading, so only one side ever moves. */
    const { attempts } = diffReviewStats({ "2": [4, 1, 0, 0] }, [row(2, [5, 1, 0, 0])], SEEN);
    expect(attempts).toEqual([{ subjectId: 2, result: REVIEW_RESULTS.correct, at: AT }]);
  });

  it("calls a review wrong when either half was missed", () => {
    /* WaniKani's own rule for whether the item goes back down a stage. */
    const { attempts } = diffReviewStats({ "3": [10, 2, 10, 1] }, [row(3, [11, 2, 10, 2])], SEEN);
    expect(attempts).toEqual([{ subjectId: 3, result: REVIEW_RESULTS.wrong, at: AT }]);
  });

  it("splits a batch into the wrong ones and the rest", () => {
    const { attempts } = diffReviewStats({ "4": [10, 0, 10, 0] }, [row(4, [12, 1, 13, 0])], SEEN);
    expect(attempts.map((attempt) => attempt.result)).toEqual([
      REVIEW_RESULTS.wrong,
      REVIEW_RESULTS.correct,
      REVIEW_RESULTS.correct,
    ]);
  });

  it("says nothing about a subject that has not moved", () => {
    expect(diffReviewStats({ "5": [3, 1, 3, 1] }, [row(5, [3, 1, 3, 1])], SEEN).attempts).toEqual([]);
  });

  it("treats a reset as no review at all, rather than as negative ones", () => {
    /* WaniKani can reset an item, and the counters go down. */
    expect(diffReviewStats({ "6": [9, 4, 9, 4] }, [row(6, [0, 0, 0, 0])], SEEN).attempts).toEqual([]);
  });

  it("records a subject reviewed for the first time since the snapshot", () => {
    const { attempts } = diffReviewStats({ "7": [1, 0, 1, 0] }, [row(8, [1, 0, 1, 0])], SEEN);
    expect(attempts).toEqual([{ subjectId: 8, result: REVIEW_RESULTS.correct, at: AT }]);
  });

  it("falls back to the moment we looked when the row carries no clock", () => {
    const { attempts } = diffReviewStats({ "9": [0, 0, 0, 0] }, [row(9, [1, 0, 1, 0], null)], SEEN);
    expect(attempts[0]!.at).toEqual(SEEN);
  });

  it("carries every subject forward, moved or not", () => {
    const { snapshot } = diffReviewStats({ "10": [1, 0, 1, 0] }, [row(11, [2, 0, 2, 0])], SEEN);
    expect(Object.keys(snapshot).sort()).toEqual(["10", "11"]);
  });
});

describe("reading the API's rows", () => {
  it("takes the four counters and the clock", () => {
    const rows = toReviewStatRows([
      {
        id: 433885427,
        data_updated_at: "2026-09-07T06:31:38.754Z",
        data: { subject_id: 2, meaning_correct: 12, meaning_incorrect: 5, reading_correct: 12, reading_incorrect: 0 },
      },
    ]);
    expect(rows).toEqual([{ subjectId: 2, counts: [12, 5, 12, 0], updatedAt: AT }]);
  });

  it("skips anything that is not a statistic", () => {
    expect(toReviewStatRows([null, "no", {}, { data: {} }])).toEqual([]);
  });
});

describe("reading the snapshot back", () => {
  it("keeps rows of four numbers and drops the rest", () => {
    expect(parseReviewStatSnapshot({ "1": [1, 2, 3, 4], "2": [1, 2], "3": "no" })).toEqual({ "1": [1, 2, 3, 4] });
  });

  it("is null for a column that has never been written", () => {
    expect(parseReviewStatSnapshot(null)).toBeNull();
    expect(parseReviewStatSnapshot([])).toBeNull();
  });
});
