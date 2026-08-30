import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();

vi.mock("./prisma", () => ({ prisma: { gameRun: { findMany: (args: unknown) => findMany(args) } } }));
vi.mock("server-only", () => ({}));

const { loadProfileGameStats } = await import("./profileStats");

type Row = {
  kind: string;
  score: number;
  bestStreak: number;
  answeredCount: number;
  correctCount: number;
  completedAt: Date | null;
  createdAt: Date;
};

function run(overrides: Partial<Row> = {}): Row {
  return {
    kind: "match",
    score: 100,
    bestStreak: 3,
    answeredCount: 10,
    correctCount: 8,
    completedAt: new Date("2026-08-29T02:45:00Z"),
    createdAt: new Date("2026-08-29T02:30:00Z"),
    ...overrides,
  };
}

beforeEach(() => findMany.mockReset());

describe("loadProfileGameStats", () => {
  /*
   * An abandoned run scores zero and answers nothing. Folding those in would
   * make a member who quits a round look worse than one who never played it,
   * so the query only ever asks for completed runs.
   */
  it("counts only completed runs", async () => {
    findMany.mockResolvedValue([]);
    await loadProfileGameStats("acct");
    expect(findMany.mock.calls[0][0].where).toEqual({ accountId: "acct", status: "completed" });
  });

  it("groups runs by game and keeps the best of each number", async () => {
    findMany.mockResolvedValue([
      run({ score: 100, bestStreak: 3 }),
      run({ score: 900, bestStreak: 2 }),
      run({ kind: "map", score: 50, bestStreak: 9 }),
    ]);

    const { byKind } = await loadProfileGameStats("acct");
    const match = byKind.find((stat) => stat.kind === "match");

    expect(match?.runs).toBe(2);
    expect(match?.bestScore).toBe(900);
    // The best streak is the best of any run, not the streak of the best run.
    expect(match?.bestStreak).toBe(3);
    expect(byKind.find((stat) => stat.kind === "map")?.runs).toBe(1);
  });

  it("averages accuracy across a game's runs rather than averaging percentages", async () => {
    findMany.mockResolvedValue([
      run({ answeredCount: 1, correctCount: 1 }),
      run({ answeredCount: 99, correctCount: 50 }),
    ]);

    // 51 of 100, not the mean of 100% and 51%.
    expect((await loadProfileGameStats("acct")).byKind[0]?.accuracy).toBe(51);
  });

  /*
   * No attempts is not the same as getting everything wrong. A profile reading
   * "0%" beside a game is a claim about the member that is not true.
   */
  it("reports no accuracy rather than zero when nothing was answered", async () => {
    findMany.mockResolvedValue([run({ answeredCount: 0, correctCount: 0 })]);

    const stats = await loadProfileGameStats("acct");
    expect(stats.byKind[0]?.accuracy).toBeNull();
    expect(stats.overallAccuracy).toBeNull();
  });

  it("takes the last played time from the newest run, and falls back when it never completed", async () => {
    findMany.mockResolvedValue([
      run({ completedAt: null, createdAt: new Date("2026-08-30T07:00:00Z") }),
      run({ completedAt: new Date("2026-08-01T00:00:00Z") }),
    ]);

    // Rows arrive newest first, so the first one seen wins.
    expect(await loadProfileGameStats("acct").then((s) => s.byKind[0]?.lastPlayedAt))
      .toBe("2026-08-30T07:00:00.000Z");
  });

  it("orders games by how much they have been played", async () => {
    findMany.mockResolvedValue([
      run({ kind: "map" }),
      run({ kind: "match" }),
      run({ kind: "match" }),
      run({ kind: "match" }),
    ]);

    expect((await loadProfileGameStats("acct")).byKind.map((stat) => stat.kind)).toEqual(["match", "map"]);
  });

  it("gives a member with no finished games an empty table, not a broken one", async () => {
    findMany.mockResolvedValue([]);

    expect(await loadProfileGameStats("acct")).toEqual({
      totalRuns: 0,
      totalAnswers: 0,
      overallAccuracy: null,
      byKind: [],
    });
  });

  it("labels a kind it does not recognize with the kind itself", async () => {
    findMany.mockResolvedValue([run({ kind: "something-new" })]);

    expect((await loadProfileGameStats("acct")).byKind[0]?.label).toBe("something-new");
  });
});
