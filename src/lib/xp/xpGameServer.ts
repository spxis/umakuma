import "server-only";

import { GAME_KIND_LABELS } from "@/app/game/GameMode.constants";
import { GAME_KINDS, type GameKind } from "@/lib/gameMode";
import { GEO_REGION_COUNTS, geoCountryFromSubjectId } from "@/lib/geoSubjectIds";
import { MAP_COUNTRIES_ALL } from "@/lib/mapCountries";
import { prisma } from "@/lib/prisma";
import type { XpEarned } from "@/lib/xp/xpToast";

import {
  GAME_XP_SKIP_REASONS,
  gameXpAwards,
  type FinishedGame,
  type GameXpSkipReason,
} from "./xpGameAwards";
import { awardXpEachQuietly } from "./xpServer";
import { XP_REASONS } from "./xpStudyAwards";
import type { XpAwardKind } from "./xpAwards";

/**
 * Paying a finished game everything it earned, and saying what that was.
 *
 * The two routes that finish a game — the answer that completes a fixed-length
 * run, and the clock that closes a timed one — both land here, so a game is
 * priced once rather than twice. They used to ask for `gameFinished` and
 * nothing else, which is why three awards sat priced and never paid: the
 * request list was a constant, and a constant cannot notice that the run it
 * belongs to was perfect.
 */
export type SettledGameXp = {
  /** One entry per thing earned, for the toasts the page raises. */
  earned: XpEarned;
  /** What this run paid in total. */
  awarded: number;
  /** Why it paid nothing, where it did. Null when it paid. */
  skipped: GameXpSkipReason | null;
};

type FinishedRun = {
  id: string;
  kind: GameKind;
  questionCount: number;
  correctCount: number;
  score: number;
};

export async function settleGameXp({
  accountId,
  run,
}: {
  accountId: string;
  run: FinishedRun;
}): Promise<SettledGameXp> {
  const game = await describeFinishedGame({ accountId, run });
  const outcomes = await awardXpEachQuietly({ accountId, requests: gameXpAwards(game) });

  /* One toast per thing achieved, in the order the rules listed them. The
     finish first, then whatever the run was good enough to add. */
  const earned: XpEarned = outcomes
    .filter((outcome) => outcome.awarded > 0)
    .map((outcome) => ({ xp: outcome.awarded, reason: GAME_XP_REASONS[outcome.kind] ?? XP_REASONS.game }));

  const awarded = outcomes.reduce((total, outcome) => total + outcome.awarded, 0);
  /* The finish is the one award the day's allowance can silence; the other
     three are achievements and are not rationed. So the allowance is what a
     run of nothing has to be explained by, and it is asked of the finish
     rather than of the total - a run that paid fifty for a personal best and
     nothing for finishing has still used somebody's third game of the day. */
  const finish = outcomes.find((outcome) => outcome.kind === "gameFinished");
  const skipped = finish && finish.awarded <= 0 ? GAME_XP_SKIP_REASONS.dailyAllowance : null;

  await recordGameXp({ runId: run.id, awarded, skipped });
  return { earned, awarded, skipped };
}

/**
 * Writing onto the run what it actually paid, at the moment it was decided.
 *
 * Not derivable afterwards, which is why it is a column and not a query: the
 * games-per-day allowance rises with rank, so replaying a run from last month
 * against today's allowance would credit XP that was never paid. John asked
 * for 0 XP runs to be logged so people could see why - right instinct, wrong
 * table, since `XpEvent` is one accumulating row per kind per day and a zero
 * would collide with the day's real `gameFinished` row without distinguishing
 * four games from two. `GameRun` is already the log of every run.
 *
 * Quiet, like the awarding above it: a game that was played and scored is not
 * failed by a bookkeeping write falling over.
 */
async function recordGameXp({
  runId,
  awarded,
  skipped,
}: {
  runId: string;
  awarded: number;
  skipped: GameXpSkipReason | null;
}): Promise<void> {
  try {
    await prisma.gameRun.update({ where: { id: runId }, data: { xpAwarded: awarded, xpSkipped: skipped } });
  } catch (problem) {
    console.error("Could not record what a game paid", runId, problem);
  }
}

/** What each award a game can pay is called, in the words a member reads. */
const GAME_XP_REASONS: Partial<Record<XpAwardKind, string>> = {
  gameFinished: XP_REASONS.game,
  flawlessGame: XP_REASONS.flawlessGame,
  personalBest: XP_REASONS.personalBest,
  mapCleared: XP_REASONS.mapCleared,
};

/** The facts about a finished run the award rules need, and nothing else. */
async function describeFinishedGame({
  accountId,
  run,
}: {
  accountId: string;
  run: FinishedRun;
}): Promise<FinishedGame> {
  const [previousBest, clearedMap] = await Promise.all([
    bestScoreBefore({ accountId, run }),
    clearedMapFor(run),
  ]);

  return {
    label: GAME_KIND_LABELS[run.kind],
    questionCount: run.questionCount,
    correctCount: run.correctCount,
    score: run.score,
    previousBest,
    clearedMap,
  };
}

/**
 * The best this account had scored at this kind before this run.
 *
 * The run itself is excluded by id rather than by time, because it has already
 * been marked complete by the transaction that called this — including it
 * would mean every run tied its own best and nothing was ever beaten.
 *
 * Null when there is no earlier run, which the award rules read as "nothing to
 * beat" rather than as a best of zero.
 */
async function bestScoreBefore({
  accountId,
  run,
}: {
  accountId: string;
  run: FinishedRun;
}): Promise<number | null> {
  const previous = await prisma.gameRun.aggregate({
    where: { accountId, kind: run.kind, status: "completed", id: { not: run.id } },
    _max: { score: true },
  });
  return previous._max.score ?? null;
}

/**
 * The country a map run covered completely, or null.
 *
 * Read from the ids the run's questions already hold: a map question's target
 * is a reserved geo subject id, and the band it falls in names the country
 * without loading a dataset. Every region named correctly, and every one of
 * them the same country, is what "cleared" means.
 *
 * **It is not reachable everywhere, and that is the data rather than a bug.**
 * A round asks at most `batchSize` questions and the largest batch is fifty,
 * so Japan's forty-seven and Canada's thirteen can be covered and the United
 * States' fifty-one cannot. Nor can a round played by capital, which draws
 * from the eighteen prefectures whose capital differs from their name.
 */
async function clearedMapFor(run: FinishedRun): Promise<FinishedGame["clearedMap"]> {
  if (run.kind !== GAME_KINDS.map) return null;

  const answered = await prisma.gameQuestion.findMany({
    where: { runId: run.id, correct: true },
    select: { targetSubjectId: true },
  });

  const found = new Set(answered.map((question) => question.targetSubjectId));
  const country = geoCountryFromSubjectId(answered[0]?.targetSubjectId ?? 0);
  if (!country || found.size !== GEO_REGION_COUNTS[country]) return null;

  /* Every id has to sit in the one country's band. Nothing mixes countries
     within a run today, but "all of them" is a claim about a country, and a
     count that matched across two of them would be the wrong claim. */
  if (![...found].every((id) => geoCountryFromSubjectId(id) === country)) return null;

  const label = MAP_COUNTRIES_ALL.find((entry) => entry.code === country)?.label ?? country;
  return { label, regionCount: GEO_REGION_COUNTS[country] };
}
