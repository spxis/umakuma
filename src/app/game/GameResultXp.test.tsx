import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GAME_KINDS, type GameRunSummary } from "@/lib/gameMode";
import { GAME_XP_SKIP_REASONS } from "@/lib/xp/xpGameAwards";

import GameResultXp from "./GameResultXp";
import { GAME_COPY } from "./GameMode.constants";

const run = (over: Partial<GameRunSummary> = {}): GameRunSummary => ({
  id: "run-1",
  accountId: "account-1",
  kind: GAME_KINDS.match,
  batchSize: 10,
  timeLimitMs: null,
  level: 5,
  category: "kanji",
  hardMode: false,
  choiceCount: 2,
  direction: "find",
  ultraMode: false,
  questionCount: 10,
  answeredCount: 10,
  correctCount: 8,
  currentStreak: 0,
  bestStreak: 4,
  score: 800,
  durationMs: 30_000,
  status: "completed",
  startedAt: "2026-09-06T00:00:00.000Z",
  completedAt: "2026-09-06T00:00:30.000Z",
  xpAwarded: 0,
  xpSkipped: null,
  ...over,
});

const draw = (summary: GameRunSummary): Document =>
  new JSDOM(`<!doctype html><body>${renderToStaticMarkup(<GameResultXp run={summary} />)}</body>`)
    .window.document;

/**
 * A game that pays nothing has to say so.
 *
 * The toasts cannot: `showXpToast` refuses anything at or below zero, on
 * purpose, since nothing there reports a loss. So the third game of a day paid
 * nothing and the whole site went quiet about it, which is indistinguishable
 * from broken — John played four games, earned ten XP, and could not tell
 * which of those two he was looking at.
 */
describe("what a finished game says it paid", () => {
  it("says what was earned", () => {
    const text = draw(run({ xpAwarded: 55 })).body.textContent ?? "";
    expect(text).toContain(GAME_COPY.xpEarned(55));
  });

  it("says nothing was earned, and why, when the day's allowance is full", () => {
    const text = draw(run({ xpSkipped: GAME_XP_SKIP_REASONS.dailyAllowance })).body.textContent ?? "";
    expect(text).toContain(GAME_COPY.xpNone);
    expect(text).toContain(GAME_COPY.xpSkipReasons[GAME_XP_SKIP_REASONS.dailyAllowance]);
  });

  /* Every reason a run can record has words to be read in, or the page prints
     "No XP" and leaves the member to guess at the half that matters. */
  it("has a sentence for every reason a run can record", () => {
    for (const reason of Object.values(GAME_XP_SKIP_REASONS)) {
      expect(GAME_COPY.xpSkipReasons[reason]).toBeTruthy();
    }
  });

  /* Runs finished before any of this was recorded hold a zero that means
     "not written down", not "earned nothing". Saying "No XP" about one would
     be a guess. */
  it("says nothing at all about a run that recorded neither", () => {
    expect(draw(run()).body.textContent?.trim()).toBe("");
  });

  it("points at the page that explains the rules", () => {
    const document = draw(run({ xpAwarded: 5 }));
    expect(document.querySelector("a")?.getAttribute("href")).toBe("/xp/earn");
  });
});
