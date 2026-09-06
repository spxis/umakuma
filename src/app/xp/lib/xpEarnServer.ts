import "server-only";

import { prisma } from "@/lib/prisma";
import { XP_AWARDS, XP_BONUSES, XP_UNAWARDED_KINDS } from "@/lib/xp/xpAwards";

/**
 * Every way to earn XP, read from the table the awards are actually paid from.
 *
 * SPX had a How to Gain XP page and it was a plain list of sources with their
 * numbers on it - the useful thing about it being that the odds were written
 * down rather than left to be inferred. Ours can do better than a written list
 * because the prices are data: `XpType` is what `awardXp` charges against, and
 * an admin can retune any of it from the site. A hand-written page would be
 * wrong the first time somebody did.
 *
 * Retired kinds are left out. Their rows stay so old history still explains
 * itself, but a member reading how to earn should not be shown a way that no
 * longer pays.
 *
 * **So are the kinds nothing fires yet, and that is the same rule read
 * forwards.** `XpType` holds a row for every proposed kind as well, so they
 * can be seen and priced in the admin screen before anything is built - which
 * is what the table is for. But this page promises a member that a thing can
 * be earned, and for nine of them nothing could: it opened advertising 300 XP
 * of game awards that no code path had ever paid. A retired kind and an
 * unwired one are the same fact about a member's day.
 *
 * The wired set is `XP_AWARDS` and `XP_BONUSES` less `XP_UNAWARDED_KINDS`,
 * which is exactly what those maps mean - `xpProposedAwards.ts` says so in its
 * own words: a kind leaves that file when something fires it. So this stays
 * true by itself. Wiring an award moves it into one of the two maps, and it
 * appears here on the same commit; no list has to be kept in step by hand.
 */

/** Every kind something actually pays. A row for anything else is not an offer. */
const WIRED_KINDS: string[] = [...Object.keys(XP_AWARDS), ...Object.keys(XP_BONUSES)].filter(
  (kind) => !(XP_UNAWARDED_KINDS as string[]).includes(kind),
);
export type XpEarnRow = {
  id: string;
  label: string;
  note: string;
  amount: number;
  /** Most a day this kind may be worth, or null where there is no ceiling. */
  dailyCap: number | null;
};

export async function loadXpEarnRows(): Promise<XpEarnRow[]> {
  const rows = await prisma.xpType.findMany({
    where: { retiredAt: null, id: { in: WIRED_KINDS } },
    orderBy: [{ amount: "desc" }, { label: "asc" }],
    select: { id: true, label: true, note: true, amount: true, dailyCap: true },
  });
  return rows;
}
