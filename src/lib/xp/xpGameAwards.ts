import { XP_EVENT_NOTES } from "./xpAwards";
import type { XpAwardRequest } from "./xpStudyAwards";

/**
 * What a finished game earned, beyond having been finished.
 *
 * Pure, and separate from the gathering in `xpGameServer.ts`, for the same
 * reason `xpStudyAwards.ts` is separate from `xpServer.ts`: deciding "that run
 * was flawless and it beat their best" is the part with the rules in it, and
 * the rules are worth testing without a database.
 *
 * Every one of these is read off what `GameRun` already records. Nothing new
 * is tracked during play, which is what made them cheap enough to wire at all
 * — they sat priced and unfired in `xpProposedAwards.ts` for months because
 * they looked like they needed instrumentation, and they never did.
 */

/**
 * A run below this many questions is not a round anybody can be flawless at.
 *
 * The smallest batch the hub offers is five, so this refuses nothing a member
 * can choose; it is here for the kinds whose length is decided by how the run
 * ended. A Shiritori chain that breaks on its first link, or a Time Attack
 * whose clock ran out after two answers, is not a perfect game — it is a game
 * that barely happened, and paying it the same as twenty right in a row would
 * make the shortest possible round the best-priced one.
 */
export const XP_FLAWLESS_GAME_MIN_QUESTIONS = 5;

export type FinishedGame = {
  /** What the game is called, for the note the member reads on their history. */
  label: string;
  questionCount: number;
  correctCount: number;
  score: number;
  /**
   * The best this account had scored at this kind before this run, or null
   * when this is their first.
   *
   * Null is not zero, and the difference is the whole award: a first run has
   * nothing to beat, so it earns nothing for beating it. Treating null as zero
   * would pay fifty XP for merely finishing one of each game, which is seven
   * games and 350 XP for turning up.
   */
  previousBest: number | null;
  /**
   * The country this run covered completely, or null.
   *
   * Set only when every region of one country was named correctly. Resolved by
   * the server from the ids the run stored, because that is the only record of
   * which places were actually asked about.
   */
  clearedMap: { label: string; regionCount: number } | null;
};

export function gameXpAwards(game: FinishedGame): XpAwardRequest[] {
  const awards: XpAwardRequest[] = [{ kind: "gameFinished" }];

  if (isFlawless(game)) {
    awards.push({
      kind: "flawlessGame",
      note: XP_EVENT_NOTES.flawlessGame(game.label, game.questionCount),
    });
  }

  if (game.previousBest !== null && game.score > game.previousBest) {
    awards.push({
      kind: "personalBest",
      note: XP_EVENT_NOTES.personalBest(game.label, game.score, game.previousBest),
    });
  }

  if (game.clearedMap) {
    awards.push({
      kind: "mapCleared",
      note: XP_EVENT_NOTES.mapCleared(game.clearedMap.label, game.clearedMap.regionCount),
    });
  }

  return awards;
}

/** Every answer right, in a round long enough for that to be an achievement. */
export function isFlawless(game: Pick<FinishedGame, "questionCount" | "correctCount">): boolean {
  return (
    game.questionCount >= XP_FLAWLESS_GAME_MIN_QUESTIONS &&
    game.correctCount === game.questionCount
  );
}

/**
 * Why a finished run paid nothing, where it paid nothing.
 *
 * A code rather than a sentence, because it is written into `GameRun.xpSkipped`
 * and read back by pages that have to word it for whoever is reading — the
 * copy lives in `GAME_COPY` with the rest of the game's words, so the locale
 * layer has one place to look and an old row does not carry last year's
 * phrasing.
 *
 * There is one, and it is the one that was silent: `awardXp` returns
 * `{ awarded: 0 }` before writing anything once the day's allowance is full,
 * so the third and fourth games of a day paid nothing and said nothing, which
 * is indistinguishable from broken. John played four and saw ten XP.
 */
export const GAME_XP_SKIP_REASONS = {
  dailyAllowance: "daily-allowance",
} as const;

export type GameXpSkipReason = (typeof GAME_XP_SKIP_REASONS)[keyof typeof GAME_XP_SKIP_REASONS];

export function isGameXpSkipReason(value: string): value is GameXpSkipReason {
  return (Object.values(GAME_XP_SKIP_REASONS) as string[]).includes(value);
}
