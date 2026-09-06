import { resolveDisplayName } from "@/lib/accountIdentity";
import { LADDER_STREAMS, type LadderStreamValue } from "@/lib/ladder/ladderStreams";
import { rankingScore, type RankingCounts, type RankingWeights } from "@/lib/ladder/rankingWeights";
import { rankMemberBoard, type MemberPlacing } from "@/lib/memberBoard";

/**
 * Ordering the UmaKuma ladder board, and nothing else.
 *
 * Pure and away from the database, like `xpBoard.ts`: who may be *listed* is
 * `listableTo`'s decision, and what a score is worth is `rankingWeights.ts`,
 * which an admin retunes from the site. What is left is which level counts.
 *
 * **The counts are shared and only the level differs.** `UkSrsState` is keyed
 * by subject, and both ladders order the same 2,235 kanji - so learned, passed
 * and burned are the same numbers whichever path a member is on. That is why
 * two boards cost barely more than one: one count query, two level columns,
 * one `rankingScore`.
 */

export type LadderBoardAccount = {
  id: string;
  slug: string | null;
  nickname: string | null;
  displayName: string | null;
  wkUsername: string | null;
  stream: LadderStreamValue;
  unLevel: number;
  ugLevel: number;
  learned: number;
  passed: number;
  burned: number;
};

export type LadderBoardEntry = MemberPlacing &
  RankingCounts & {
    id: string;
    name: string;
    address: string | null;
    /** The path this member follows, which is also which level was counted. */
    stream: LadderStreamValue;
    score: number;
  };

/**
 * The level that counts for a member, on the board being drawn.
 *
 * On a board filtered to one path it is that path's level for everybody. On
 * the board of everyone it is each member's *own* path, because comparing a
 * UG member's UN level would rank them on a ladder they have never climbed -
 * their answers were given against the other ordering.
 */
export function ladderLevelFor(
  account: Pick<LadderBoardAccount, "stream" | "unLevel" | "ugLevel">,
  stream: LadderStreamValue | null,
): number {
  const counted = stream ?? account.stream;
  return counted === LADDER_STREAMS.ug ? account.ugLevel : account.unLevel;
}

/**
 * The board, best first.
 *
 * `stream` null is the board of everyone, each on their own path; naming a
 * stream filters to the members following it. The placing itself is
 * `rankMemberBoard`, which every board shares - equal scores share a place,
 * the next skips, and each row carries the distance to the member above.
 */
export function rankLadderBoard(
  accounts: readonly LadderBoardAccount[],
  weights: RankingWeights,
  stream: LadderStreamValue | null = null,
): LadderBoardEntry[] {
  const eligible = stream === null ? accounts : accounts.filter((account) => account.stream === stream);

  const scored = eligible.map((account) => {
    const counts: RankingCounts = {
      level: ladderLevelFor(account, stream),
      learned: account.learned,
      passed: account.passed,
      burned: account.burned,
    };
    return { ...account, ...counts, score: rankingScore(counts, weights) };
  });

  return rankMemberBoard(scored, {
    score: (account) => account.score,
    tiebreak: (account) => resolveDisplayName(account),
  }).map((account) => ({
    id: account.id,
    place: account.place,
    sharesPlace: account.sharesPlace,
    toPassAbove: account.toPassAbove,
    name: resolveDisplayName(account),
    address: account.slug ?? account.wkUsername ?? null,
    stream: account.stream,
    level: account.level,
    learned: account.learned,
    passed: account.passed,
    burned: account.burned,
    score: account.score,
  }));
}
