
export const WANIKANI_RATE_LIMIT_REQUESTS_PER_MINUTE = 60;
const DEFAULT_LEADERBOARD_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_REQUEST_GAP_MS = 1000;
const MIN_SAFE_REQUEST_GAP_MS = Math.ceil(60_000 / WANIKANI_RATE_LIMIT_REQUESTS_PER_MINUTE) + 100;
const DEFAULT_STUDY_HISTORY_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

// (duplicate removed)

// Admin-tweakable via environment variables.
export const LEADERBOARD_REFRESH_INTERVAL_MS = parsePositiveInt(
  process.env.LEADERBOARD_REFRESH_INTERVAL_MS,
  DEFAULT_LEADERBOARD_REFRESH_INTERVAL_MS,
);

// Aggressive default per product requirement. Increase if you hit API rate limits.
export const LEADERBOARD_REQUEST_GAP_MS = parsePositiveInt(
  process.env.LEADERBOARD_REQUEST_GAP_MS,
  DEFAULT_REQUEST_GAP_MS,
);

// Re-use local snapshots during this window for subject-history refresh requests.
export const STUDY_HISTORY_REFRESH_COOLDOWN_MS = parsePositiveInt(
  process.env.STUDY_HISTORY_REFRESH_COOLDOWN_MS,
  DEFAULT_STUDY_HISTORY_REFRESH_COOLDOWN_MS,
);

// Keep a conservative gap under the documented 60 req/min API limit.
export const EFFECTIVE_WANIKANI_REQUEST_GAP_MS = Math.max(
  LEADERBOARD_REQUEST_GAP_MS,
  MIN_SAFE_REQUEST_GAP_MS,
);
