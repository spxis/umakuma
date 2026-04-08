const DEFAULT_LEADERBOARD_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_REQUEST_GAP_MS = 5 * 1000;

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

export const WANIKANI_RATE_LIMIT_REQUESTS_PER_MINUTE = 60;

// Admin-tweakable via environment variables.
export const LEADERBOARD_REFRESH_INTERVAL_MS = parsePositiveInt(
  process.env.LEADERBOARD_REFRESH_INTERVAL_MS,
  DEFAULT_LEADERBOARD_REFRESH_INTERVAL_MS,
);

// Keep the default at 5s to stay safely under WaniKani's 60 req/min limit.
export const LEADERBOARD_REQUEST_GAP_MS = parsePositiveInt(
  process.env.LEADERBOARD_REQUEST_GAP_MS,
  DEFAULT_REQUEST_GAP_MS,
);
