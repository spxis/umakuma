import { describe, expect, it } from "vitest";

import {
  GAME_LIVE_WINDOW_MS,
  buildGameActivity,
  isRunLive,
  playAccuracyPercent,
  selectLatestPerKind,
  selectLiveByKind,
  type GameLiveRunRow,
  type GameRunActivityRow,
} from "./gameActivity";

const NOW = Date.parse("2026-08-30T12:00:00.000Z");

function completed(overrides: Partial<GameRunActivityRow> = {}): GameRunActivityRow {
  return {
    kind: "match",
    accountId: "acct-emi",
    playerName: "Emi",
    score: 100,
    correctCount: 8,
    questionCount: 10,
    completedAt: new Date(NOW - 60_000),
    ...overrides,
  };
}

function live(overrides: Partial<GameLiveRunRow> = {}): GameLiveRunRow {
  return {
    kind: "match",
    playerName: "Jay",
    startedAt: new Date(NOW - 30_000),
    updatedAt: new Date(NOW - 5_000),
    ...overrides,
  };
}

describe("isRunLive", () => {
  it("counts a run answered moments ago", () => {
    expect(isRunLive(new Date(NOW - 5_000), NOW)).toBe(true);
  });

  it("drops a run left untouched past the window", () => {
    expect(isRunLive(new Date(NOW - GAME_LIVE_WINDOW_MS - 1), NOW)).toBe(false);
  });

  it("keeps a run exactly on the boundary", () => {
    expect(isRunLive(new Date(NOW - GAME_LIVE_WINDOW_MS), NOW)).toBe(true);
  });

  it("does not treat a clock skewed into the future as stale", () => {
    expect(isRunLive(new Date(NOW + 10_000), NOW)).toBe(true);
  });

  it("accepts an ISO string as well as a Date", () => {
    expect(isRunLive(new Date(NOW - 1_000).toISOString(), NOW)).toBe(true);
  });
});

describe("selectLatestPerKind", () => {
  it("keeps the most recent run for each kind", () => {
    const latest = selectLatestPerKind([
      completed({ kind: "match", playerName: "Old", completedAt: new Date(NOW - 900_000) }),
      completed({ kind: "match", playerName: "New", completedAt: new Date(NOW - 60_000) }),
      completed({ kind: "map", playerName: "Mika", completedAt: new Date(NOW - 300_000) }),
    ]);

    expect(latest.match?.playerName).toBe("New");
    expect(latest.map?.playerName).toBe("Mika");
  });

  it("ignores order of input", () => {
    const latest = selectLatestPerKind([
      completed({ playerName: "New", completedAt: new Date(NOW - 60_000) }),
      completed({ playerName: "Old", completedAt: new Date(NOW - 900_000) }),
    ]);

    expect(latest.match?.playerName).toBe("New");
  });

  it("drops runs that never completed", () => {
    expect(selectLatestPerKind([completed({ completedAt: null })])).toEqual({});
  });

  it("returns an ISO string the client can parse", () => {
    const latest = selectLatestPerKind([completed({ completedAt: new Date(NOW) })]);
    expect(latest.match?.completedAt).toBe("2026-08-30T12:00:00.000Z");
  });

  it("returns nothing for no rows", () => {
    expect(selectLatestPerKind([])).toEqual({});
  });
});

describe("selectLiveByKind", () => {
  it("groups live runs under their kind", () => {
    const result = selectLiveByKind([live({ kind: "shiritori" })], NOW);
    expect(result.shiritori).toHaveLength(1);
    expect(result.shiritori?.[0].playerName).toBe("Jay");
  });

  it("excludes a run whose last answer fell outside the window", () => {
    const result = selectLiveByKind([live({ updatedAt: new Date(NOW - 600_000) })], NOW);
    expect(result).toEqual({});
  });

  it("orders players by how long they have been in the run", () => {
    const result = selectLiveByKind(
      [
        live({ playerName: "Recent", startedAt: new Date(NOW - 10_000) }),
        live({ playerName: "Longest", startedAt: new Date(NOW - 120_000) }),
      ],
      NOW,
    );

    expect(result.match?.map((entry) => entry.playerName)).toEqual(["Longest", "Recent"]);
  });

  it("honours a custom window", () => {
    const row = live({ updatedAt: new Date(NOW - 20_000) });
    expect(selectLiveByKind([row], NOW, 10_000)).toEqual({});
    expect(selectLiveByKind([row], NOW, 30_000).match).toHaveLength(1);
  });
});

describe("buildGameActivity", () => {
  it("reports the last play and the live players together", () => {
    const activity = buildGameActivity(
      [completed({ kind: "match", playerName: "Emi" })],
      [live({ kind: "match", playerName: "Jay" })],
      NOW,
    );

    expect(activity.match?.last?.playerName).toBe("Emi");
    expect(activity.match?.live.map((entry) => entry.playerName)).toEqual(["Jay"]);
  });

  it("includes a kind that has only ever been played, never live", () => {
    const activity = buildGameActivity([completed({ kind: "map" })], [], NOW);
    expect(activity.map?.last).not.toBeNull();
    expect(activity.map?.live).toEqual([]);
  });

  it("includes a kind being played for the very first time", () => {
    const activity = buildGameActivity([], [live({ kind: "time_attack" })], NOW);
    expect(activity["time_attack"]?.last).toBeNull();
    expect(activity["time_attack"]?.live).toHaveLength(1);
  });

  it("omits a kind nobody has touched", () => {
    const activity = buildGameActivity([completed({ kind: "match" })], [], NOW);
    expect(activity.map).toBeUndefined();
  });

  it("returns nothing when there is no history at all", () => {
    expect(buildGameActivity([], [], NOW)).toEqual({});
  });

  it("shows the live round and the last result together, not one instead of the other", () => {
    const activity = buildGameActivity(
      [completed({ kind: "match", playerName: "Emi" })],
      [live({ kind: "match", playerName: "Jay" })],
      NOW,
    );

    expect(activity.match?.live).toHaveLength(1);
    expect(activity.match?.last?.playerName).toBe("Emi");
  });

  it("reports the viewer's own latest run alongside the overall latest", () => {
    const activity = buildGameActivity(
      [
        completed({ accountId: "acct-emi", playerName: "Emi", completedAt: new Date(NOW - 60_000) }),
        completed({ accountId: "acct-jay", playerName: "Jay", score: 42, completedAt: new Date(NOW - 900_000) }),
      ],
      [],
      NOW,
      "acct-jay",
    );

    expect(activity.match?.last?.playerName).toBe("Emi");
    expect(activity.match?.viewerLast?.playerName).toBe("Jay");
    expect(activity.match?.viewerLast?.score).toBe(42);
  });

  it("leaves viewerLast null when the viewer has never finished the game", () => {
    const activity = buildGameActivity(
      [completed({ accountId: "acct-emi" })],
      [],
      NOW,
      "acct-nobody",
    );

    expect(activity.match?.last).not.toBeNull();
    expect(activity.match?.viewerLast).toBeNull();
  });

  it("leaves viewerLast null when no viewer was given", () => {
    const activity = buildGameActivity([completed()], [], NOW);
    expect(activity.match?.viewerLast).toBeNull();
  });

  it("sets last and viewerLast to the same run when the viewer is the last player", () => {
    const activity = buildGameActivity(
      [completed({ accountId: "acct-emi", playerName: "Emi" })],
      [],
      NOW,
      "acct-emi",
    );

    expect(activity.match?.last?.accountId).toBe("acct-emi");
    expect(activity.match?.viewerLast?.accountId).toBe("acct-emi");
  });

  it("includes a kind only the viewer has played", () => {
    const activity = buildGameActivity(
      [completed({ kind: "shiritori", accountId: "acct-jay" })],
      [],
      NOW,
      "acct-jay",
    );

    expect(activity.shiritori?.viewerLast?.accountId).toBe("acct-jay");
  });
});

describe("playAccuracyPercent", () => {
  it("reports whole percentages", () => {
    const latest = selectLatestPerKind([completed({ correctCount: 8, questionCount: 10 })]);
    expect(playAccuracyPercent(latest.match!)).toBe(80);
  });

  it("rounds to the nearest whole percent", () => {
    const latest = selectLatestPerKind([completed({ correctCount: 2, questionCount: 3 })]);
    expect(playAccuracyPercent(latest.match!)).toBe(67);
  });

  it("returns null rather than dividing by zero", () => {
    const latest = selectLatestPerKind([completed({ questionCount: 0 })]);
    expect(playAccuracyPercent(latest.match!)).toBeNull();
  });
});
