import "server-only";

import { GAME_KIND_LABELS } from "@/app/game/GameMode.constants";
import { GAME_KINDS, type GameKind } from "@/lib/gameMode";
import { GEO_REGION_COUNTS, geoCountryFromSubjectId } from "@/lib/geoSubjectIds";
import { MAP_COUNTRIES_ALL } from "@/lib/mapCountries";
import { prisma } from "@/lib/prisma";
import type { XpEarned } from "@/lib/xp/xpToast";

import { gameXpAwards, type FinishedGame } from "./xpGameAwards";
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
  /** What this run paid in total, for recording on the run itself. */
  awarded: number;
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

  return { earned, awarded: outcomes.reduce((total, outcome) => total + outcome.awarded, 0) };
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
