/**
 * What the game history page says, in one map for the locale layer.
 *
 * The XP wording is the model - this is a member's third record and reads like
 * the other two - but the grain is different and the copy has to say so. An XP
 * row is a whole day of one kind of earning; a row here is one game. That is
 * the difference the page exists for: "four games, ten XP" cannot be answered
 * by a day's total, only run by run.
 *
 * The sentence for a game that paid nothing is NOT here. It lives in
 * `GAME_COPY.xpSkipReasons`, keyed by the code stored on the run, and the
 * results panel reads the same map - a second wording would let the two
 * disagree about the same game.
 */
export const GAME_HISTORY_COPY = {
  title: "Game history",
  subtitle: (name: string) => `Every game ${name} has finished, and what each one paid`,
  back: "Games",
  grain:
    "One row is one game. XP is what that run actually paid at the time - the day's allowance grows with your rank, so a game played after it is used up pays nothing.",
  columns: {
    played: "Played",
    game: "Game",
    result: "Result",
    score: "Score",
    xp: "XP",
  },
  sortHint: "Sort by this column",
  allKinds: "Every game",
  kindCount: (count: number, xp: number) =>
    `${count.toLocaleString()} ${count === 1 ? "run" : "runs"} · ${xp.toLocaleString()} XP`,
  summary: (shown: number, total: number, xp: number) =>
    `${shown.toLocaleString()} of ${total.toLocaleString()} runs · ${xp.toLocaleString()} XP`,
  perPage: (size: number) => `${size} per page`,
  /** `18/20` reads as a fraction anywhere; the screen reader gets the words. */
  result: (correct: number, questions: number) => `${correct}/${questions}`,
  resultLabel: (correct: number, questions: number) => `${correct} of ${questions} correct`,
  /*
   * A run from before any of this was recorded has no XP and no reason, and
   * saying "no XP" about it would be a guess - the results panel refuses the
   * same guess. A dash is the honest mark for "not recorded".
   */
  xpUnrecorded: "—",
  xpUnrecordedTitle: "This run finished before UmaKuma recorded what a game paid.",
  empty: "No finished games yet.",
  emptyFiltered: "You have not finished one of those yet.",
  emptyHint: "Play anything in the games hub and it lands here, with what it paid.",
  loading: "Loading your games…",
  failed: "Could not load your game history. Try again?",
} as const;
