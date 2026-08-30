import type { GameKind } from "@/lib/gameMode";

/**
 * Who played each game last, and who is playing one right now.
 *
 * Both answers come out of `GameRun` as it already stands. A run's `updatedAt`
 * is bumped by every answer, so a run that is `active` and was touched inside
 * the live window is one somebody is sitting in front of. Nothing here needs a
 * schema change.
 *
 * This detects *playing*, not *viewing*: someone reading the hub without
 * starting a round leaves no trace on any run. Presence proper needs its own
 * heartbeat and is deliberately not faked here.
 */

/**
 * How long after its last answer a run still counts as live.
 *
 * Long enough to survive a slow question — a player thinking, or reading a
 * prompt — and short enough that a tab abandoned mid-round stops claiming
 * somebody is playing. A round answered every few seconds refreshes it
 * continuously.
 */
export const GAME_LIVE_WINDOW_MS = 90_000;

export type GameRunActivityRow = {
  kind: GameKind;
  playerName: string;
  score: number;
  correctCount: number;
  questionCount: number;
  completedAt: Date | string | null;
};

export type GameLiveRunRow = {
  kind: GameKind;
  playerName: string;
  startedAt: Date | string;
  updatedAt: Date | string;
};

export type GameLastPlay = {
  playerName: string;
  score: number;
  correctCount: number;
  questionCount: number;
  /** ISO 8601, so it survives JSON on the way to the client. */
  completedAt: string;
};

export type GameLivePlay = {
  playerName: string;
  startedAt: string;
};

export type GameKindActivity = {
  last: GameLastPlay | null;
  live: GameLivePlay[];
};

export type GameActivityByKind = Partial<Record<GameKind, GameKindActivity>>;

function toMs(value: Date | string | null): number | null {
  if (value === null) {
    return null;
  }

  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/** True while a run is recent enough to count as someone actively playing. */
export function isRunLive(
  updatedAt: Date | string,
  nowMs: number,
  windowMs: number = GAME_LIVE_WINDOW_MS,
): boolean {
  const ms = toMs(updatedAt);
  if (ms === null) {
    return false;
  }

  // A clock skewed into the future should not read as stale.
  return nowMs - ms <= windowMs;
}

/**
 * The most recently completed run for each kind.
 *
 * Rows with no `completedAt` are dropped rather than treated as oldest: an
 * incomplete run has not been played to a score worth showing.
 */
export function selectLatestPerKind(
  rows: readonly GameRunActivityRow[],
): Partial<Record<GameKind, GameLastPlay>> {
  const latest: Partial<Record<GameKind, GameLastPlay>> = {};
  const latestMs: Partial<Record<GameKind, number>> = {};

  for (const row of rows) {
    const ms = toMs(row.completedAt);
    if (ms === null) {
      continue;
    }

    const currentMs = latestMs[row.kind];
    if (currentMs !== undefined && currentMs >= ms) {
      continue;
    }

    latestMs[row.kind] = ms;
    latest[row.kind] = {
      playerName: row.playerName,
      score: row.score,
      correctCount: row.correctCount,
      questionCount: row.questionCount,
      completedAt: new Date(ms).toISOString(),
    };
  }

  return latest;
}

/**
 * Groups live runs by kind, oldest first so the longest-running player reads as
 * the one who has been at it. Only runs inside the window are kept.
 */
export function selectLiveByKind(
  rows: readonly GameLiveRunRow[],
  nowMs: number,
  windowMs: number = GAME_LIVE_WINDOW_MS,
): Partial<Record<GameKind, GameLivePlay[]>> {
  const live: Partial<Record<GameKind, GameLivePlay[]>> = {};

  const ordered = [...rows]
    .filter((row) => isRunLive(row.updatedAt, nowMs, windowMs))
    .sort((left, right) => (toMs(left.startedAt) ?? 0) - (toMs(right.startedAt) ?? 0));

  for (const row of ordered) {
    const bucket = live[row.kind] ?? [];
    bucket.push({ playerName: row.playerName, startedAt: toIso(row.startedAt) });
    live[row.kind] = bucket;
  }

  return live;
}

/** Combines both halves into the shape the hub cards read. */
export function buildGameActivity(
  completedRows: readonly GameRunActivityRow[],
  liveRows: readonly GameLiveRunRow[],
  nowMs: number,
  windowMs: number = GAME_LIVE_WINDOW_MS,
): GameActivityByKind {
  const latest = selectLatestPerKind(completedRows);
  const live = selectLiveByKind(liveRows, nowMs, windowMs);

  const activity: GameActivityByKind = {};
  const kinds = new Set<GameKind>([
    ...(Object.keys(latest) as GameKind[]),
    ...(Object.keys(live) as GameKind[]),
  ]);

  for (const kind of kinds) {
    activity[kind] = { last: latest[kind] ?? null, live: live[kind] ?? [] };
  }

  return activity;
}

/** Accuracy as a whole percentage, or null when the run recorded no questions. */
export function playAccuracyPercent(play: GameLastPlay): number | null {
  if (play.questionCount <= 0) {
    return null;
  }

  return Math.round((play.correctCount / play.questionCount) * 100);
}
