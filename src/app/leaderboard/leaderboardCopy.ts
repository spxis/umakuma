import { rankingFormulaText, type RankingWeights } from "@/lib/ladder/rankingWeights";

/**
 * What the home leaderboard says about how it ranks.
 *
 * The formula sentence used to be typed out by hand under the board, so it
 * described whatever the weights were on the day somebody wrote it. It is
 * derived now: the words and the arithmetic come from the same object, and an
 * admin retuning the weights retunes the sentence with them.
 */
export const LEADERBOARD_COPY = {
  weightLabels: {
    level: "level",
    learned: "reviewed",
    passed: "learned kanji",
    burned: "burned",
  } as Record<keyof RankingWeights, string>,
  formula: (weights: RankingWeights) =>
    `Score formula: ${rankingFormulaText(weights, LEADERBOARD_COPY.weightLabels)}`,
} as const;
