import { beforeEach, describe, expect, it, vi } from "vitest";

type WrittenRow = {
  accountId: string;
  assignmentId: number;
  subjectId: number;
  subjectType: string;
  result: string;
  source: string;
  submittedAt: Date;
};

let written: WrittenRow[] = [];

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    studyReviewAttempt: {
      createMany: async ({ data }: { data: WrittenRow[] }) => {
        written.push(...data);
        return { count: data.length };
      },
    },
  },
}));

const { recordWanikaniReviews } = await import("./wanikaniReviewHistory");

const ANSWERED = new Date("2026-09-07T06:31:38.754Z");
const SYNCED = new Date("2026-09-07T10:30:00.000Z");

/* One assignment for 妥, as the sync's own cache holds it. */
const assignments = [{ id: 8801, data: { subject_id: 452, subject_type: "kanji" } }];

beforeEach(() => {
  written = [];
});

/*
 * John: "So my Study Attempts under History do not show my recent work
 * through the WK API!" They now do - not read from a collection, because
 * WaniKani has none to give, but worked out from the counters and written
 * down as his.
 */
describe("reviews answered on WaniKani", () => {
  it("writes nothing on the first look, and keeps the snapshot", async () => {
    const result = await recordWanikaniReviews({
      accountId: "acc",
      previous: null,
      rows: [{ subjectId: 452, counts: [40, 3, 40, 2], updatedAt: ANSWERED }],
      assignments,
      seenAt: SYNCED,
    });

    /* Otherwise every member wakes up to nine thousand reviews at once. */
    expect(result.written).toBe(0);
    expect(written).toEqual([]);
    expect(result.snapshot["452"]).toEqual([40, 3, 40, 2]);
  });

  it("writes what moved, marked as WaniKani's", async () => {
    const result = await recordWanikaniReviews({
      accountId: "acc",
      previous: { "452": [40, 3, 40, 2] },
      rows: [{ subjectId: 452, counts: [41, 3, 41, 2], updatedAt: ANSWERED }],
      assignments,
      seenAt: SYNCED,
    });

    expect(result.written).toBe(1);
    expect(written).toEqual([
      {
        accountId: "acc",
        assignmentId: 8801,
        subjectId: 452,
        subjectType: "kanji",
        result: "correct",
        source: "wanikani",
        /* Their clock, not ours: when the subject was answered. */
        submittedAt: ANSWERED,
      },
    ]);
  });

  it("skips a subject it cannot place, rather than inventing an assignment", async () => {
    const result = await recordWanikaniReviews({
      accountId: "acc",
      previous: { "999": [0, 0, 0, 0] },
      rows: [{ subjectId: 999, counts: [1, 0, 1, 0], updatedAt: ANSWERED }],
      assignments,
      seenAt: SYNCED,
    });

    expect(result.written).toBe(0);
    expect(written).toEqual([]);
    /* The snapshot still moves, so the review is not counted again next time. */
    expect(result.snapshot["999"]).toEqual([1, 0, 1, 0]);
  });

  it("touches the database only when there is something to write", async () => {
    const result = await recordWanikaniReviews({
      accountId: "acc",
      previous: { "452": [41, 3, 41, 2] },
      rows: [{ subjectId: 452, counts: [41, 3, 41, 2], updatedAt: ANSWERED }],
      assignments,
      seenAt: SYNCED,
    });

    expect(result.written).toBe(0);
    expect(written).toEqual([]);
  });

  it("writes a wrong answer as wrong", async () => {
    await recordWanikaniReviews({
      accountId: "acc",
      previous: { "452": [41, 3, 41, 2] },
      rows: [{ subjectId: 452, counts: [41, 4, 42, 2], updatedAt: ANSWERED }],
      assignments,
      seenAt: SYNCED,
    });

    expect(written.map((row) => row.result)).toEqual(["wrong"]);
  });
});
