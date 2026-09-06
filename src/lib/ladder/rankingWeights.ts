/**
 * What a leaderboard score is made of, and what each part is worth.
 *
 * The WaniKani board has ranked members on
 * `wkLevel * 1000 + reviewCount * 2 + burnedCount * 4 + learnedKanji * 3` since
 * it was written, as four literals typed inline in one expression. That had
 * three problems and this fixes all of them.
 *
 * 1. **It could not be changed without a deploy.** Weights are a judgement
 *    about what the site rewards, and a judgement wants tuning. They live in
 *    `SiteSetting` now, the way the SRS rules and the rest settings already
 *    do, parsed with bounds and defaults so a hand-edited request cannot put a
 *    nonsense number in front of a member.
 * 2. **It had drifted twice.** The home page footer printed the formula as a
 *    hand-typed sentence, and the seed script scored members on a *different*
 *    formula - `level * 1000 + reviewCount`, no burns, no kanji - so a seeded
 *    board ranked people by rules production does not use. Both now derive
 *    from here, so neither can say something the code does not do.
 * 3. **Nothing tested it.** There was no test asserting the weights, the
 *    arithmetic or even that more work scores higher.
 *
 * The same shape scores both ladders. WaniKani's inputs come from their API;
 * ours come from `UkSrsState`. What "a level" and "a burn" are worth is the
 * same question either way, so it is one set of weights and one function.
 */

export type RankingWeights = {
  /** A level is worth a lot: it is the headline number on every badge. */
  level: number;
  /** Each item the member has met. */
  learned: number;
  /** Each item carried to Guru or beyond - the work that stuck. */
  passed: number;
  /** Each item carried all the way to the top stage. */
  burned: number;
};

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  level: 1000,
  learned: 2,
  passed: 3,
  burned: 4,
};

/** What a member's record contributes, in the units the weights price. */
export type RankingCounts = {
  level: number;
  learned: number;
  passed: number;
  burned: number;
};

export const RANKING_WEIGHT_KEYS = ["level", "learned", "passed", "burned"] as const;

/**
 * Bounds, because these come off an admin form and end up multiplying counts.
 *
 * Zero is allowed and useful - it turns a term off - but negative is not: a
 * board where doing more work lowers your score is not a tuning, it is a bug
 * somebody typed. The ceiling stops one term from swamping the rest so far
 * that the others may as well not exist.
 */
export const RANKING_WEIGHT_MIN = 0;
export const RANKING_WEIGHT_MAX = 100_000;

function bounded(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(RANKING_WEIGHT_MAX, Math.max(RANKING_WEIGHT_MIN, Math.round(value)));
}

export function parseRankingWeights(raw: string | null | undefined): RankingWeights {
  if (!raw) return DEFAULT_RANKING_WEIGHTS;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof RankingWeights, unknown>>;
    return {
      level: bounded(parsed.level, DEFAULT_RANKING_WEIGHTS.level),
      learned: bounded(parsed.learned, DEFAULT_RANKING_WEIGHTS.learned),
      passed: bounded(parsed.passed, DEFAULT_RANKING_WEIGHTS.passed),
      burned: bounded(parsed.burned, DEFAULT_RANKING_WEIGHTS.burned),
    };
  } catch {
    return DEFAULT_RANKING_WEIGHTS;
  }
}

/** The score itself. One line, and the only place it is written. */
export function rankingScore(counts: RankingCounts, weights: RankingWeights): number {
  return (
    counts.level * weights.level +
    counts.learned * weights.learned +
    counts.passed * weights.passed +
    counts.burned * weights.burned
  );
}

/**
 * The formula in words, derived rather than typed.
 *
 * The home page footer printed this as a sentence somebody wrote by hand, so
 * it went stale the moment anybody touched the numbers. Now it cannot: the
 * words and the arithmetic come from the same object.
 */
export function rankingFormulaText(weights: RankingWeights, labels: Record<keyof RankingWeights, string>): string {
  return RANKING_WEIGHT_KEYS.filter((key) => weights[key] > 0)
    .map((key) => `${labels[key]} × ${weights[key].toLocaleString()}`)
    .join(" + ");
}
