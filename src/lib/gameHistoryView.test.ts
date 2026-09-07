import { beforeEach, describe, expect, it, vi } from "vitest";

const count = vi.fn();
const findMany = vi.fn();
const groupBy = vi.fn();
const aggregate = vi.fn();

vi.mock("./prisma", () => ({
  prisma: {
    gameRun: {
      count: (args: unknown) => count(args),
      findMany: (args: unknown) => findMany(args),
      groupBy: (args: unknown) => groupBy(args),
      aggregate: (args: unknown) => aggregate(args),
    },
  },
}));
vi.mock("server-only", () => ({}));

const { getGameHistoryPage } = await import("./gameHistoryView");
const { GAME_HISTORY_SORTS, GAME_HISTORY_SORT_DIRS } = await import("./gameHistoryQuery");

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "run_1",
    accountId: "acct",
    kind: "match",
    batchSize: 10,
    level: 12,
    category: "kanji",
    hardMode: false,
    choiceCount: 2,
    direction: "find",
    answerMode: "auto",
    timeLimitMs: null,
    questionCount: 10,
    answeredCount: 10,
    correctCount: 9,
    currentStreak: 4,
    bestStreak: 6,
    score: 1200,
    durationMs: 41_000,
    status: "completed",
    startedAt: new Date("2026-09-06T02:30:00Z"),
    completedAt: new Date("2026-09-06T02:31:00Z"),
    xpAwarded: 5,
    xpSkipped: null,
    ...overrides,
  };
}

const query = {
  accountId: "acct",
  page: 1,
  pageSize: 25,
  sortBy: GAME_HISTORY_SORTS.played,
  sortDir: GAME_HISTORY_SORT_DIRS.desc,
};

beforeEach(() => {
  count.mockReset().mockResolvedValue(1);
  findMany.mockReset().mockResolvedValue([row()]);
  groupBy.mockReset().mockResolvedValue([{ kind: "match", _count: 1, _sum: { xpAwarded: 5 } }]);
  aggregate.mockReset().mockResolvedValue({ _count: 1, _sum: { xpAwarded: 5 } });
});

describe("getGameHistoryPage", () => {
  /*
   * An abandoned run is a game somebody walked away from mid-question and an
   * active one has not happened yet. Listing either as history would report a
   * game that was never played.
   */
  it("asks only for this member's finished runs", async () => {
    await getGameHistoryPage(query);

    expect(findMany.mock.calls[0][0].where).toEqual({
      accountId: "acct",
      status: "completed",
      completedAt: { not: null },
    });
  });

  it("keeps the filter off the totals, so the counts stay the account's own", async () => {
    await getGameHistoryPage({ ...query, kind: "daily" });

    expect(findMany.mock.calls[0][0].where.kind).toBe("daily");
    expect(aggregate.mock.calls[0][0].where.kind).toBeUndefined();
    expect(groupBy.mock.calls[0][0].where.kind).toBeUndefined();
  });

  /*
   * Two runs with the same score come back in whatever order the planner
   * liked, so page 2 could repeat a row page 1 already showed. Every sort
   * falls back to the finish time to break that tie.
   */
  it("breaks every tie on when the game finished", async () => {
    await getGameHistoryPage({ ...query, sortBy: GAME_HISTORY_SORTS.score });
    expect(findMany.mock.calls[0][0].orderBy).toEqual([{ score: "desc" }, { completedAt: "desc" }]);

    await getGameHistoryPage({ ...query, sortBy: GAME_HISTORY_SORTS.xp, sortDir: "asc" });
    expect(findMany.mock.calls[1][0].orderBy).toEqual([{ xpAwarded: "asc" }, { completedAt: "asc" }]);
  });

  it("pages in the database rather than in memory", async () => {
    await getGameHistoryPage({ ...query, page: 3, pageSize: 50 });

    expect(findMany.mock.calls[0][0]).toMatchObject({ skip: 100, take: 50 });
  });

  it("reports what each run paid, in the shape the results panel draws", async () => {
    findMany.mockResolvedValue([row({ xpAwarded: 0, xpSkipped: "daily-allowance" })]);

    const page = await getGameHistoryPage(query);

    expect(page.rows[0]).toMatchObject({
      id: "run_1",
      kind: "match",
      score: 1200,
      xpAwarded: 0,
      xpSkipped: "daily-allowance",
      completedAt: "2026-09-06T02:31:00.000Z",
    });
  });

  /* The filter opens on the games a member actually plays, not on the enum. */
  it("orders the filter by how much each game has been played", async () => {
    groupBy.mockResolvedValue([
      { kind: "match", _count: 2, _sum: { xpAwarded: 10 } },
      { kind: "daily", _count: 9, _sum: { xpAwarded: 45 } },
    ]);

    const page = await getGameHistoryPage(query);

    expect(page.facets.map((facet) => facet.kind)).toEqual(["daily", "match"]);
  });

  /* A game nobody has ever earned XP on sums to null, not to zero. */
  it("reads an empty sum as nothing earned", async () => {
    groupBy.mockResolvedValue([{ kind: "map", _count: 3, _sum: { xpAwarded: null } }]);
    aggregate.mockResolvedValue({ _count: 3, _sum: { xpAwarded: null } });

    const page = await getGameHistoryPage(query);

    expect(page.allXp).toBe(0);
    expect(page.facets[0].xp).toBe(0);
    expect(page.filteredXp).toBe(0);
  });

  it("never reports fewer than one page, so the pager cannot ask for page 0 of 0", async () => {
    count.mockResolvedValue(0);
    findMany.mockResolvedValue([]);

    const page = await getGameHistoryPage(query);

    expect(page.pagination).toEqual({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  });
});
